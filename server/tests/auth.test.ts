process.env.NODE_ENV = "test";

import { UserRepository } from "../modules/auth/repositories/UserRepository";
import { RoleRepository } from "../modules/auth/repositories/RoleRepository";
import { PermissionRepository } from "../modules/auth/repositories/PermissionRepository";
import { AuthService } from "../modules/auth/services/AuthService";
import { AuthorizationService } from "../modules/auth/services/AuthorizationService";
import { authenticate } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/authorization.middleware";
import { Logger } from "../utils/logger";
import { Request, Response } from "express";

async function runAuthTests() {
  Logger.info("========================================");
  Logger.info("   INICIANDO TESTES DA FASE 1 (AUTH & RBAC) ");
  Logger.info("========================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      Logger.info(`✔ PASSED: ${testName}`);
      passed++;
    } else {
      Logger.error(`❌ FAILED: ${testName}`);
      failed++;
    }
  }

  const userRepository = new UserRepository();
  const roleRepository = new RoleRepository();
  const permissionRepository = new PermissionRepository();
  const authService = new AuthService();
  const authorizationService = new AuthorizationService();

  // Helper mock for Express Request & Response
  function createMockReqRes(token?: string) {
    const req = {
      headers: {
        authorization: token ? `Bearer ${token}` : undefined,
      },
      query: {},
      params: {},
      body: {},
    } as unknown as Request;

    const res = {
      status: function (code: number) {
        this.statusCode = code;
        return this;
      },
      json: function (data: any) {
        this.body = data;
        return this;
      },
      statusCode: 200,
      body: null as any,
    } as unknown as Response;

    return { req, res };
  }

  try {
    // ----------------------------------------------------
    // SETUP: Seed test roles and permissions
    // ----------------------------------------------------
    Logger.info("Semeando (seeding) dados de teste no Firestore...");

    // Create default test roles
    const studentRole = {
      id: "test-student-role",
      name: "Student",
      description: "Default student role",
      isSystem: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const adminRole = {
      id: "test-admin-role",
      name: "Admin",
      description: "Super Administrator role",
      isSystem: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await roleRepository.create(studentRole);
    await roleRepository.create(adminRole);

    // Create default test permissions
    const readPermission = {
      id: "courses.read",
      resource: "courses",
      action: "read",
      description: "Read courses list",
    };
    const createPermission = {
      id: "courses.create",
      resource: "courses",
      action: "create",
      description: "Create new courses",
    };
    const deletePermission = {
      id: "courses.delete",
      resource: "courses",
      action: "delete",
      description: "Delete courses",
    };
    await permissionRepository.create(readPermission);
    await permissionRepository.create(createPermission);
    await permissionRepository.create(deletePermission);

    // Link permissions to roles
    await roleRepository.addPermissionToRole("test-student-role", "courses.read");
    await roleRepository.addPermissionToRole("test-admin-role", "*"); // admin wildcard

    // Clean up any stale test user
    await userRepository.delete("test-student-uid");
    await userRepository.delete("test-admin-uid");
    await userRepository.delete("test-inactive-uid");

    // ----------------------------------------------------
    // TEST 1: User Sync & Auto Registration
    // ----------------------------------------------------
    const syncedStudent = await authService.syncUser(
      "test-student-uid",
      "student@test.com",
      "Student Test",
      "test-student-role"
    );
    assert(syncedStudent !== null, "Deve criar o usuário estudante com sucesso");
    assert(syncedStudent.roleId === "test-student-role", "Deve herdar a role preferida 'test-student-role'");
    assert(syncedStudent.status === "active", "Usuário sincronizado deve nascer ativo");

    const syncAdmin = await authService.syncUser(
      "test-admin-uid",
      "andrewfmlemos@gmail.com",
      "Andrew Admin"
    );
    assert(syncAdmin !== null, "Deve registrar usuário com e-mail andrewfmlemos@gmail.com como administrador");
    assert(syncAdmin.roleId === "admin", "Administrador principal deve herdar a role 'admin' do sistema");

    // ----------------------------------------------------
    // TEST 2: JWT Verification & Simulation
    // ----------------------------------------------------
    const tokenResult = await authService.verifyToken("test-token:test-student-uid:student:Student Test");
    assert(tokenResult.uid === "test-student-uid", "Deve verificar o JWT simulado e retornar o UID correto");
    assert(tokenResult.email === "student@test.com", "Deve verificar o JWT simulado e retornar o e-mail");

    try {
      await authService.verifyToken("invalid-token");
      assert(false, "Token inválido deve falhar na verificação");
    } catch (e) {
      assert(true, "Token inválido falhou com erro conforme esperado");
    }

    try {
      await authService.verifyToken("test-token:expired");
      assert(false, "Token expirado deve falhar na verificação");
    } catch (e) {
      assert(true, "Token expirado falhou com erro conforme esperado");
    }

    // ----------------------------------------------------
    // TEST 3: Authenticate Middleware
    // ----------------------------------------------------
    const { req: reqAuth, res: resAuth } = createMockReqRes("test-token:test-student-uid:student:Student Test");
    let nextCalled: boolean = false;
    await authenticate(reqAuth, resAuth, () => {
      nextCalled = true;
    });

    assert(nextCalled, "Membro autenticado deve avançar no middleware (next chamado)");
    assert((reqAuth as any).user !== undefined, "User deve estar anexado em req.user");
    assert((reqAuth as any).user.id === "test-student-uid", "req.user.id deve ser igual a test-student-uid");
    assert((reqAuth as any).user.permissions.includes("courses.read"), "req.user deve herdar as permissões de sua role");

    // Test Authenticate with inactive user
    const inactiveUser = await authService.syncUser(
      "test-inactive-uid",
      "inactive@test.com",
      "Inactive User",
      "test-student-role"
    );
    await userRepository.update("test-inactive-uid", { status: "inactive" });

    const { req: reqInact, res: resInact } = createMockReqRes("test-token:test-inactive-uid:inactive:Inactive User");
    let inactNextError: any = null;
    await authenticate(reqInact, resInact, (err) => {
      inactNextError = err;
    });
    assert(inactNextError !== null, "Membro inativo deve ser bloqueado na autenticação");

    // ----------------------------------------------------
    // TEST 4: Authorization (Access Allowed & Access Denied)
    // ----------------------------------------------------
    const { req: reqPermit, res: resPermit } = createMockReqRes();
    (reqPermit as any).user = {
      id: "test-student-uid",
      email: "student@test.com",
      name: "Student Test",
      roleId: "test-student-role",
      permissions: ["courses.read"],
    };

    let authNextCalled: boolean = false;
    const requireRead = requirePermission("courses.read");
    requireRead(reqPermit, resPermit, () => {
      authNextCalled = true;
    });
    assert(authNextCalled, "Acesso permitido para usuário com a permissão requerida");

    let authNextError: any = null;
    const requireCreate = requirePermission("courses.create");
    requireCreate(reqPermit, resPermit, (err) => {
      authNextError = err;
    });
    assert(authNextError !== null && authNextError.statusCode === 403, "Acesso negado (403) para recurso sem a permissão requerida");

    // ----------------------------------------------------
    // TEST 5: Wildcards (*) Matching
    // ----------------------------------------------------
    const wildcardPerms = ["courses.*"];
    assert(AuthorizationService.matchPermission(wildcardPerms, "courses.read") === true, "courses.* deve autorizar courses.read");
    assert(AuthorizationService.matchPermission(wildcardPerms, "courses.create") === true, "courses.* deve autorizar courses.create");
    assert(AuthorizationService.matchPermission(wildcardPerms, "users.read") === false, "courses.* não deve autorizar users.read");

    const superAdminPerms = ["*"];
    assert(AuthorizationService.matchPermission(superAdminPerms, "any.action") === true, "Super Admin '*' deve autorizar qualquer recurso");

    // ----------------------------------------------------
    // TEST 6: User Overrides (User Permissions)
    // ----------------------------------------------------
    // Grant explicit override to user
    await permissionRepository.addPermissionToUser("test-student-uid", "courses.create", true);
    // Deny explicit override to user
    await permissionRepository.addPermissionToUser("test-student-uid", "courses.read", false);

    const overridenPerms = await authorizationService.resolveUserPermissions("test-student-uid");
    assert(overridenPerms.includes("courses.create") === true, "Usuário deve herdar permissão sobrescrita (override: true)");
    assert(overridenPerms.includes("courses.read") === false, "Usuário deve perder permissão sobrescrita negada (override: false)");

    // Clean overrides
    await permissionRepository.removePermissionFromUser("test-student-uid", "courses.create");
    await permissionRepository.removePermissionFromUser("test-student-uid", "courses.read");

    // ----------------------------------------------------
    // TEST 7: Invalid Roles / Unexistent Users
    // ----------------------------------------------------
    const nonExistentPerms = await authorizationService.resolveUserPermissions("non-existent-user-id");
    assert(nonExistentPerms.length === 0, "Usuário inexistente deve resolver para zero permissões");

    // Clean up seeding
    await userRepository.delete("test-student-uid");
    await userRepository.delete("test-admin-uid");
    await userRepository.delete("test-inactive-uid");

    Logger.info("========================================");
    Logger.info(` RESUMO DOS TESTES: ${passed} passaram, ${failed} falharam.`);
    Logger.info("========================================");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    Logger.error("Erro fatal na execução dos testes de Auth & RBAC", error);
    process.exit(1);
  }
}

runAuthTests();
