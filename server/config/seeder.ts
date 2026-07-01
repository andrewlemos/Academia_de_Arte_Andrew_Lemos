import { firestoreDb } from "./firebase";
import { Logger } from "../utils/logger";

export async function bootstrapDatabase() {
  Logger.info("Iniciando checagem de sementes (seeding) de RBAC no Firestore...");

  try {
    const rolesCollection = firestoreDb.collection("roles");
    const permissionsCollection = firestoreDb.collection("permissions");
    const rolePermissionsCollection = firestoreDb.collection("role_permissions");

    // 1. Roles padrão
    const defaultRoles = [
      {
        id: "admin",
        name: "Admin",
        description: "Super Administrador com controle total do sistema",
        isSystem: true,
      },
      {
        id: "instructor",
        name: "Instrutor",
        description: "Criador de conteúdo, cursos, módulos e lições",
        isSystem: true,
      },
      {
        id: "support",
        name: "Suporte",
        description: "Responsável por responder dúvidas e interagir no fórum",
        isSystem: true,
      },
      {
        id: "student",
        name: "Estudante",
        description: "Aluno com acesso à visualização de cursos e aulas",
        isSystem: true,
      },
    ];

    for (const role of defaultRoles) {
      const docRef = rolesCollection.doc(role.id);
      const doc = await docRef.get();
      if (!doc.exists) {
        Logger.info(`Semeando cargo: ${role.name} (${role.id})`);
        await docRef.set({
          ...role,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    // 2. Permissões padrão
    const defaultPermissions = [
      { id: "courses.read", resource: "courses", action: "read", description: "Visualizar lista de cursos e lições" },
      { id: "courses.create", resource: "courses", action: "create", description: "Criar novos cursos" },
      { id: "courses.update", resource: "courses", action: "update", description: "Editar cursos existentes" },
      { id: "courses.delete", resource: "courses", action: "delete", description: "Remover cursos do catálogo" },
      
      { id: "users.read", resource: "users", action: "read", description: "Visualizar usuários cadastrados" },
      { id: "users.update", resource: "users", action: "update", description: "Alterar cargos e status de usuários" },

      { id: "roles.read", resource: "roles", action: "read", description: "Visualizar cargos e permissões associadas" },
      { id: "roles.create", resource: "roles", action: "create", description: "Criar novos cargos customizados" },
      { id: "roles.update", resource: "roles", action: "update", description: "Modificar permissões associadas a cargos" },

      { id: "permissions.read", resource: "permissions", action: "read", description: "Visualizar todas as permissões granulares" },
      { id: "permissions.create", resource: "permissions", action: "create", description: "Criar novas permissões no sistema" },

      { id: "support.read", resource: "support", action: "read", description: "Ler tickets e comentários do suporte" },
      { id: "support.create", resource: "support", action: "create", description: "Enviar novas dúvidas e comentários" },
      { id: "support.update", resource: "support", action: "update", description: "Responder e resolver tickets do fórum" },

      { id: "certificates.issue", resource: "certificates", action: "issue", description: "Emitir certificados para alunos" },
      { id: "certificates.read", resource: "certificates", action: "read", description: "Visualizar certificados emitidos" },
    ];

    for (const perm of defaultPermissions) {
      const docRef = permissionsCollection.doc(perm.id);
      const doc = await docRef.get();
      if (!doc.exists) {
        Logger.info(`Semeando permissão: ${perm.id}`);
        await docRef.set(perm);
      }
    }

    // 3. Relações de cargo -> permissão padrão
    const defaultRolePermissions = [
      // Admin tem wildcard "*"
      { roleId: "admin", permissionId: "*" },

      // Instrutor cria e atualiza conteúdo
      { roleId: "instructor", permissionId: "courses.read" },
      { roleId: "instructor", permissionId: "courses.create" },
      { roleId: "instructor", permissionId: "courses.update" },
      { roleId: "instructor", permissionId: "courses.delete" },
      { roleId: "instructor", permissionId: "support.read" },
      { roleId: "instructor", permissionId: "support.update" },
      { roleId: "instructor", permissionId: "certificates.issue" },
      { roleId: "instructor", permissionId: "certificates.read" },

      // Aluno assiste e interage
      { roleId: "student", permissionId: "courses.read" },
      { roleId: "student", permissionId: "support.read" },
      { roleId: "student", permissionId: "support.create" },
      { roleId: "student", permissionId: "certificates.read" },

      // Suporte lê conteúdo e resolve tickets
      { roleId: "support", permissionId: "courses.read" },
      { roleId: "support", permissionId: "support.read" },
      { roleId: "support", permissionId: "support.update" },
    ];

    for (const rp of defaultRolePermissions) {
      const id = `${rp.roleId}_${rp.permissionId}`;
      const docRef = rolePermissionsCollection.doc(id);
      const doc = await docRef.get();
      if (!doc.exists) {
        Logger.info(`Semeando associação Role-Permission: ${rp.roleId} -> ${rp.permissionId}`);
        await docRef.set({
          roleId: rp.roleId,
          permissionId: rp.permissionId,
        });
      }
    }

    Logger.info("Bootstrap do banco de dados (RBAC) concluído com sucesso!");

    // --- Structured migration from local db.json if Firestore is empty ---
    try {
      const isProd = process.env.NODE_ENV === "production";
      if (!isProd) {
        Logger.info("[FIREBASE] Verificando se o Firestore precisa de migração inicial...");
        const coursesSnapshot = await firestoreDb.collection("courses").limit(1).get();

        if (coursesSnapshot.empty) {
          const DB_PATH = path.join(process.cwd(), "data", "db.json");
          const fs = await import("fs");
          if (fs.existsSync(DB_PATH)) {
            Logger.info("[FIREBASE] Firestore está vazio. Iniciando migração estruturada a partir do db.json local...");
            const raw = fs.readFileSync(DB_PATH, "utf-8");
            const data = JSON.parse(raw);

            const collectionsToMigrate = [
              { name: "courses", data: data.courses || [] },
              { name: "modules", data: data.modules || [] },
              { name: "lessons", data: data.lessons || [] },
              { name: "apostilas", data: data.apostilas || [] },
              { name: "users", data: data.users || [] },
              { name: "sales", data: data.sales || [] },
              { name: "coupons", data: data.coupons || [] },
              { name: "progress", data: data.progress || [] },
              { name: "supportTickets", data: data.supportTickets || [] },
              { name: "certificates", data: data.certificates || [] },
              { name: "supportComments", data: data.supportComments || [] }
            ];

            for (const col of collectionsToMigrate) {
              Logger.info(`[FIREBASE] Migrando coleção "${col.name}" (${col.data.length} documentos)...`);
              const batchSize = 100;
              for (let i = 0; i < col.data.length; i += batchSize) {
                const batch = firestoreDb.batch();
                const chunk = col.data.slice(i, i + batchSize);
                for (const doc of chunk) {
                  const docId = doc.id || `doc_${Math.random().toString(36).substr(2, 9)}`;
                  const docRef = firestoreDb.collection(col.name).doc(docId);
                  batch.set(docRef, doc);
                }
                await batch.commit();
              }
            }
            Logger.info("[FIREBASE] Migração estruturada do db.json concluída com sucesso!");
          } else {
            Logger.warn(`[FIREBASE] Arquivo db.json não encontrado em: ${DB_PATH}. Ignorando migração inicial.`);
          }
        } else {
          Logger.info("[FIREBASE] Firestore já possui dados. Pulando migração estruturada.");
        }
      }
    } catch (migError: any) {
      Logger.error("[FIREBASE] Erro ao executar migração estruturada do db.json:", migError);
    }
  } catch (error) {
    Logger.error("Falha ao executar bootstrap do banco de dados (RBAC)", error);
  }
}

import * as path from "path";
