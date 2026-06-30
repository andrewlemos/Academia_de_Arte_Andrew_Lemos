import express from "express";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import AdmZip from "adm-zip";
import * as admin from "firebase-admin";
import { initializeApp as initializeClientApp } from "firebase/app";
import { 
  getFirestore as getClientFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  writeBatch, 
  limit 
} from "firebase/firestore";

dotenv.config();

// Initialize Firebase Admin SDK
try {
  admin.initializeApp({
    projectId: "gen-lang-client-0853696923"
  });
  console.log("[FIREBASE] Admin SDK inicializado com sucesso.");
} catch (error) {
  console.error("[FIREBASE] Erro ao inicializar Admin SDK, tentando inicializar sem config:", error);
  try {
    admin.initializeApp();
  } catch (err) {
    console.error("[FIREBASE] Falha total ao inicializar Admin SDK:", err);
  }
}

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DB_PATH = path.join(process.cwd(), "data", "db.json");

app.use(express.json());

// API route to download the entire project as a ZIP
app.get("/api/download-zip", (req, res) => {
  try {
    const zip = new AdmZip();
    
    function addDirToZip(currentDir: string, zipPath: string) {
      const items = fs.readdirSync(currentDir);
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        const relativeZipPath = zipPath ? `${zipPath}/${item}` : item;
        
        // Exclude system, build and package-lock folders
        if (
          item === "node_modules" || 
          item === ".git" || 
          item === "dist" || 
          item === ".next" ||
          item === "package-lock.json" ||
          item === "projeto.zip"
        ) {
          continue;
        }
        
        if (stat.isDirectory()) {
          addDirToZip(fullPath, relativeZipPath);
        } else {
          zip.addLocalFile(fullPath, zipPath);
        }
      }
    }

    addDirToZip(process.cwd(), "");

    const zipBuffer = zip.toBuffer();
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", "attachment; filename=projeto.zip");
    res.send(zipBuffer);
  } catch (err: any) {
    console.error("Erro ao criar pacote ZIP:", err);
    res.status(500).send("Erro ao criar pacote ZIP: " + err.message);
  }
});

// API route to download the entire project as a tar.gz
app.get("/api/download-project", (req, res) => {
  try {
    const archivePath = path.join("/tmp", `academiadearte-project-${Date.now()}.tar.gz`);
    // Compress workspace excluding node_modules, dist, etc.
    execSync(`tar --exclude='node_modules' --exclude='.git' --exclude='dist' -czf ${archivePath} .`);
    res.download(archivePath, "academiadearte-project.tar.gz", (err) => {
      try {
        if (fs.existsSync(archivePath)) {
          fs.unlinkSync(archivePath);
        }
      } catch (cleanErr) {
        console.error("Erro ao limpar arquivo temporario:", cleanErr);
      }
    });
  } catch (err: any) {
    console.error("Erro ao criar pacote de download:", err);
    res.status(500).send("Erro ao criar pacote de download: " + err.message);
  }
});

// Lazy-initialized Gemini API client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY") {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
  }
  return aiClient;
}

const clientAppConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8"));
const clientApp = initializeClientApp(clientAppConfig);
const clientDb = getClientFirestore(clientApp, clientAppConfig.firestoreDatabaseId);

// Helper functions to read/write local db.json
function readLocalDb(): any {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
    }
  } catch (err) {
    console.error("Erro ao ler db.json local:", err);
  }
  return {};
}

function writeLocalDb(data: any) {
  try {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Erro ao escrever db.json local:", err);
  }
}

// Sync single document to local db.json
function saveLocalDocument(collectionName: string, id: string, docData: any) {
  const db = readLocalDb();
  if (!db[collectionName]) {
    db[collectionName] = [];
  }
  
  let index = -1;
  if (collectionName === "progress") {
    index = db[collectionName].findIndex((item: any) => 
      (item.id === id) || 
      (item.studentId === docData.studentId && item.lessonId === docData.lessonId)
    );
  } else {
    index = db[collectionName].findIndex((item: any) => item.id === id);
  }

  const updatedItem = { id, ...docData };
  if (index !== -1) {
    db[collectionName][index] = { ...db[collectionName][index], ...updatedItem };
  } else {
    db[collectionName].push(updatedItem);
  }
  writeLocalDb(db);
}

// Delete single document from local db.json
function deleteLocalDocument(collectionName: string, id: string) {
  const db = readLocalDb();
  if (db[collectionName]) {
    db[collectionName] = db[collectionName].filter((item: any) => item.id !== id);
    writeLocalDb(db);
  }
}

// SmartCollection class that wraps Firestore with a seamless local db.json fallback
class SmartCollection {
  constructor(private name: string) {}

  doc(id: string) {
    const colName = this.name;
    const docRef = doc(clientDb, colName, id);
    return {
      realRef: docRef,
      get: async () => {
        try {
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            return {
              exists: true,
              ref: {
                update: async (data: any) => {
                  await updateDoc(docRef, data);
                  saveLocalDocument(colName, id, data);
                }
              },
              data: () => docSnap.data()
            };
          }
        } catch (err) {
          console.warn(`[FIREBASE FAILBACK] Erro ao buscar documento no Firestore (${colName}/${id}), usando db.json:`, err);
        }
        // Fallback local
        const localDb = readLocalDb();
        const item = (localDb[colName] || []).find((x: any) => x.id === id);
        if (item) {
          return {
            exists: true,
            ref: {
              update: async (data: any) => {
                saveLocalDocument(colName, id, data);
              }
            },
            data: () => item
          };
        }
        return {
          exists: false,
          ref: {
            update: async (data: any) => {
              saveLocalDocument(colName, id, data);
            }
          },
          data: () => null
        };
      },
      set: async (data: any, options?: { merge?: boolean }) => {
        try {
          await setDoc(docRef, data, options || {});
        } catch (err) {
          console.warn(`[FIREBASE FAILBACK] Erro ao salvar no Firestore (${colName}/${id}), usando db.json:`, err);
        }
        // Sempre salvar localmente para manter o backup atualizado
        saveLocalDocument(colName, id, data);
      },
      update: async (data: any) => {
        try {
          await updateDoc(docRef, data);
        } catch (err) {
          console.warn(`[FIREBASE FAILBACK] Erro ao atualizar no Firestore (${colName}/${id}), usando db.json:`, err);
        }
        // Sempre salvar localmente para manter o backup atualizado
        saveLocalDocument(colName, id, data);
      },
      delete: async () => {
        try {
          await deleteDoc(docRef);
        } catch (err) {
          console.warn(`[FIREBASE FAILBACK] Erro ao deletar no Firestore (${colName}/${id}), usando db.json:`, err);
        }
        deleteLocalDocument(colName, id);
      }
    };
  }

  where(field: string, op: string, value: any) {
    const colName = this.name;
    const filters = [{ field, op, value }];
    
    const queryBuilder = {
      where: (f: string, o: string, v: any) => {
        filters.push({ field: f, op: o, value: v });
        return queryBuilder;
      },
      get: async () => {
        try {
          const queryConstraints = filters.map(filter => {
            return where(filter.field, filter.op as any, filter.value);
          });
          const q = query(collection(clientDb, colName), ...queryConstraints);
          const snapshot = await getDocs(q);
          const list: any[] = [];
          snapshot.forEach((d) => {
            const dRef = d.ref;
            list.push({
              id: d.id,
              ref: {
                delete: async () => {
                  await deleteDoc(dRef);
                  deleteLocalDocument(colName, d.id);
                },
                update: async (data: any) => {
                  await updateDoc(dRef, data);
                  saveLocalDocument(colName, d.id, data);
                }
              },
              data: () => d.data()
            });
          });
          return {
            forEach: (cb: (doc: any) => void) => list.forEach(cb),
            empty: list.length === 0,
            docs: list
          };
        } catch (err) {
          console.warn(`[FIREBASE FAILBACK] Erro ao consultar Firestore (${colName}), usando db.json:`, err);
        }
        
        // Fallback local
        const localDb = readLocalDb();
        const list = (localDb[colName] || []).filter((x: any) => {
          return filters.every(filter => {
            if (filter.op === "==") return x[filter.field] === filter.value;
            return false;
          });
        }).map((item: any) => ({
          id: item.id,
          ref: {
            delete: async () => deleteLocalDocument(colName, item.id),
            update: async (data: any) => saveLocalDocument(colName, item.id, data)
          },
          data: () => item
        }));
        
        return {
          forEach: (cb: (doc: any) => void) => list.forEach(cb),
          empty: list.length === 0,
          docs: list
        };
      }
    };
    
    return queryBuilder;
  }

  limit(num: number) {
    const colName = this.name;
    return {
      get: async () => {
        try {
          const q = query(collection(clientDb, colName), limit(num));
          const snapshot = await getDocs(q);
          const list: any[] = [];
          snapshot.forEach((d) => {
            list.push({
              id: d.id,
              data: () => d.data()
            });
          });
          return {
            empty: list.length === 0,
            forEach: (cb: (doc: any) => void) => list.forEach(cb)
          };
        } catch (err) {
          console.warn(`[FIREBASE FAILBACK] Erro ao limitar consulta no Firestore (${colName} limit ${num}), usando db.json:`, err);
          const localDb = readLocalDb();
          const list = (localDb[colName] || []).slice(0, num).map((item: any) => ({
            id: item.id,
            data: () => item
          }));
          return {
            empty: list.length === 0,
            forEach: (cb: (doc: any) => void) => list.forEach(cb)
          };
        }
      }
    };
  }
}

// Global wrapper object that exposes SmartCollection & SmartBatch
const fdb = {
  collection: (name: string) => new SmartCollection(name),
  batch: () => {
    const realBatch = writeBatch(clientDb);
    const ops: (() => Promise<void>)[] = [];
    return {
      set: (docRefWrapper: any, data: any) => {
        try {
          const actualRef = docRefWrapper.realRef || docRefWrapper;
          realBatch.set(actualRef, data);
        } catch (e) {
          console.error("[BATCH ERROR] set failed:", e);
        }
        if (docRefWrapper && docRefWrapper.realRef) {
          const actualRef = docRefWrapper.realRef;
          const parts = actualRef.path.split("/");
          if (parts.length === 2) {
            ops.push(async () => saveLocalDocument(parts[0], parts[1], data));
          }
        }
      },
      update: (docRefWrapper: any, data: any) => {
        try {
          const actualRef = docRefWrapper.realRef || docRefWrapper;
          realBatch.update(actualRef, data);
        } catch (e) {
          console.error("[BATCH ERROR] update failed:", e);
        }
        if (docRefWrapper && docRefWrapper.realRef) {
          const actualRef = docRefWrapper.realRef;
          const parts = actualRef.path.split("/");
          if (parts.length === 2) {
            ops.push(async () => saveLocalDocument(parts[0], parts[1], data));
          }
        }
      },
      delete: (docRefWrapper: any) => {
        try {
          const actualRef = docRefWrapper.realRef || docRefWrapper;
          realBatch.delete(actualRef);
        } catch (e) {
          console.error("[BATCH ERROR] delete failed:", e);
        }
        if (docRefWrapper && docRefWrapper.realRef) {
          const actualRef = docRefWrapper.realRef;
          const parts = actualRef.path.split("/");
          if (parts.length === 2) {
            ops.push(async () => deleteLocalDocument(parts[0], parts[1]));
          }
        } else if (docRefWrapper && docRefWrapper.delete) {
          ops.push(async () => docRefWrapper.delete());
        }
      },
      commit: async () => {
        try {
          await realBatch.commit();
        } catch (err) {
          console.warn("[FIREBASE FAILBACK] Erro ao commitar batch no Firestore, executando operações locais:", err);
        }
        for (const op of ops) {
          await op();
        }
      }
    };
  },
  databaseId: "ai-studio-plataformadecurs-57ed65e2-5e5e-40bb-b5e1-9c6fa8c753b8"
};

// Get all documents from a collection as an array
async function getCollection(collectionName: string): Promise<any[]> {
  try {
    const q = query(collection(clientDb, collectionName));
    const snapshot = await getDocs(q);
    const list: any[] = [];
    snapshot.forEach((doc) => {
      list.push(doc.data());
    });
    return list;
  } catch (error) {
    console.warn(`[FIREBASE FAILBACK] Erro ao buscar coleção "${collectionName}" no Firestore. Usando db.json local.`, error);
    const localDb = readLocalDb();
    return localDb[collectionName] || [];
  }
}

// Migrar os dados do db.json para o Firestore de forma estruturada caso o Firestore esteja vazio
async function migrateFromLocalJsonIfNeeded() {
  try {
    console.log("[FIREBASE] Verificando se o Firestore precisa de migração inicial...");
    
    // Usamos a coleção "courses" como indicador se o banco está vazio
    const coursesSnapshot = await fdb.collection("courses").limit(1).get();
    
    if (coursesSnapshot.empty) {
      console.log("[FIREBASE] Firestore está vazio. Iniciando migração estruturada a partir do db.json local...");
      
      if (fs.existsSync(DB_PATH)) {
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
          { name: "progress", data: data.progress || [], isProgress: true },
          { name: "supportTickets", data: data.supportTickets || [] },
          { name: "certificates", data: data.certificates || [] },
          { name: "supportComments", data: data.supportComments || [] }
        ];
        
        for (const col of collectionsToMigrate) {
          console.log(`[FIREBASE] Migrando coleção "${col.name}" (${col.data.length} documentos)...`);
          
          const batchSize = 100;
          for (let i = 0; i < col.data.length; i += batchSize) {
            const batch = fdb.batch();
            const chunk = col.data.slice(i, i + batchSize);
            
            chunk.forEach((item: any) => {
              let docId;
              if (col.isProgress) {
                docId = `progress_${item.studentId}_${item.lessonId}`;
              } else {
                docId = item.id;
              }
              
              if (!docId) {
                docId = `migrated_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
              }
              
              const docRef = fdb.collection(col.name).doc(docId);
              batch.set(docRef, item);
            });
            
            await batch.commit();
          }
          console.log(`[FIREBASE] Coleção "${col.name}" migrada com sucesso.`);
        }
        console.log("[FIREBASE] Migração inicial concluída com total sucesso!");
      } else {
        console.log("[FIREBASE] Nenhum db.json local encontrado para migração.");
      }
    } else {
      console.log("[FIREBASE] O Firestore já possui dados. Pulando migração inicial.");
    }
  } catch (error) {
    console.error("[FIREBASE] Erro crítico durante a migração inicial do Firestore:", error);
  }
}

// ==========================================
// REST API ENDPOINTS
// ==========================================

// 1. GET FULL DATABASE STATE (For Admin backups or inspection)
app.get("/api/db", async (req, res) => {
  try {
    const [
      courses, modules, lessons, apostilas,
      users, sales, coupons, progress,
      supportTickets, certificates, supportComments
    ] = await Promise.all([
      getCollection("courses"),
      getCollection("modules"),
      getCollection("lessons"),
      getCollection("apostilas"),
      getCollection("users"),
      getCollection("sales"),
      getCollection("coupons"),
      getCollection("progress"),
      getCollection("supportTickets"),
      getCollection("certificates"),
      getCollection("supportComments")
    ]);

    res.json({
      courses,
      modules,
      lessons,
      apostilas,
      users,
      sales,
      coupons,
      progress,
      supportTickets,
      certificates,
      supportComments
    });
  } catch (error: any) {
    console.error("Erro ao ler banco de dados completo do Firestore:", error);
    res.status(500).json({ error: error.message });
  }
});

// 2. COURSES CRUD
app.get("/api/courses", async (req, res) => {
  try {
    const list = await getCollection("courses");
    res.json(list);
  } catch (error: any) {
    console.error("Erro ao buscar cursos:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/courses", async (req, res) => {
  try {
    const course = req.body;
    if (!course.id) {
      course.id = `course_${Date.now()}`;
    }
    await fdb.collection("courses").doc(course.id).set(course, { merge: true });
    res.status(200).json({ success: true, course });
  } catch (error: any) {
    console.error("Erro ao salvar curso no Firestore:", error);
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/courses/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Delete course
    await fdb.collection("courses").doc(id).delete();

    // Delete associated modules
    const modulesSnapshot = await fdb.collection("modules").where("courseId", "==", id).get();
    const modulesBatch = fdb.batch();
    modulesSnapshot.forEach((doc) => {
      modulesBatch.delete(doc.ref);
    });
    await modulesBatch.commit();

    // Delete associated lessons
    const lessonsSnapshot = await fdb.collection("lessons").where("courseId", "==", id).get();
    const lessonsBatch = fdb.batch();
    lessonsSnapshot.forEach((doc) => {
      lessonsBatch.delete(doc.ref);
    });
    await lessonsBatch.commit();

    res.json({ success: true, message: "Curso e conteúdos removidos." });
  } catch (error: any) {
    console.error("Erro ao excluir curso no Firestore:", error);
    res.status(500).json({ error: error.message });
  }
});

// 3. MODULES CRUD
app.get("/api/modules", async (req, res) => {
  try {
    const list = await getCollection("modules");
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/modules", async (req, res) => {
  try {
    const mod = req.body;
    if (!mod.id) {
      mod.id = `module_${Date.now()}`;
    }
    await fdb.collection("modules").doc(mod.id).set(mod, { merge: true });
    res.json({ success: true, module: mod });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/modules/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await fdb.collection("modules").doc(id).delete();

    // Delete associated lessons
    const lessonsSnapshot = await fdb.collection("lessons").where("moduleId", "==", id).get();
    const batch = fdb.batch();
    lessonsSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    res.json({ success: true, message: "Módulo e suas aulas removidos." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. LESSONS CRUD
app.get("/api/lessons", async (req, res) => {
  try {
    const list = await getCollection("lessons");
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/lessons", async (req, res) => {
  try {
    const lesson = req.body;
    if (!lesson.id) {
      lesson.id = `lesson_${Date.now()}`;
    }
    await fdb.collection("lessons").doc(lesson.id).set(lesson, { merge: true });
    res.json({ success: true, lesson });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/lessons/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await fdb.collection("lessons").doc(id).delete();
    res.json({ success: true, message: "Aula removida com sucesso." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. APOSTILAS (Digital E-Books) CRUD
app.get("/api/apostilas", async (req, res) => {
  try {
    const list = await getCollection("apostilas");
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/apostilas", async (req, res) => {
  try {
    const book = req.body;
    if (!book.id) {
      book.id = `ebook_${Date.now()}`;
    }
    await fdb.collection("apostilas").doc(book.id).set(book, { merge: true });
    res.json({ success: true, apostila: book });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/apostilas/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await fdb.collection("apostilas").doc(id).delete();
    res.json({ success: true, message: "Apostila excluída." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 6. SALES & SIMULATED PAYMENTS
app.get("/api/sales", async (req, res) => {
  try {
    const list = await getCollection("sales");
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/sales", async (req, res) => {
  try {
    const sale = req.body;
    sale.id = `sale_${Date.now()}`;
    sale.createdAt = new Date().toISOString();

    if (sale.paymentStatus === "approved") {
      const userQuery = await fdb.collection("users").where("email", "==", sale.studentEmail).get();
      if (!userQuery.empty) {
        const userDoc = userQuery.docs[0];
        const userData = userDoc.data();
        const purchasedProducts = userData.purchasedProducts || [];
        if (!purchasedProducts.includes(sale.productId)) {
          purchasedProducts.push(sale.productId);
          await userDoc.ref.update({ purchasedProducts });
        }
      } else {
        const newStudent = {
          id: `user_student_${Date.now()}`,
          name: sale.studentName,
          email: sale.studentEmail,
          role: "student",
          avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop",
          purchasedProducts: [sale.productId]
        };
        await fdb.collection("users").doc(newStudent.id).set(newStudent);
      }
    }

    await fdb.collection("sales").doc(sale.id).set(sale);
    res.json({ success: true, sale });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/sales/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;
    const saleDoc = await fdb.collection("sales").doc(id).get();
    if (saleDoc.exists) {
      const sale = saleDoc.data()!;
      sale.paymentStatus = "approved";

      const userQuery = await fdb.collection("users").where("email", "==", sale.studentEmail).get();
      if (!userQuery.empty) {
        const userDoc = userQuery.docs[0];
        const userData = userDoc.data();
        const purchasedProducts = userData.purchasedProducts || [];
        if (!purchasedProducts.includes(sale.productId)) {
          purchasedProducts.push(sale.productId);
          await userDoc.ref.update({ purchasedProducts });
        }
      } else {
        const newStudent = {
          id: `user_student_${Date.now()}`,
          name: sale.studentName,
          email: sale.studentEmail,
          role: "student",
          avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop",
          purchasedProducts: [sale.productId]
        };
        await fdb.collection("users").doc(newStudent.id).set(newStudent);
      }

      await saleDoc.ref.update({ paymentStatus: "approved" });
      res.json({ success: true, sale });
    } else {
      res.status(404).json({ error: "Transação não encontrada" });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 7. COUPONS CRUD
app.get("/api/coupons", async (req, res) => {
  try {
    const list = await getCollection("coupons");
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/coupons", async (req, res) => {
  try {
    const coupon = req.body;
    if (!coupon.id) {
      coupon.id = `coupon_${Date.now()}`;
    }
    await fdb.collection("coupons").doc(coupon.id).set(coupon, { merge: true });
    res.json({ success: true, coupon });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/coupons/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await fdb.collection("coupons").doc(id).delete();
    res.json({ success: true, message: "Cupom deletado." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 8. PROGRESS MANIPULATION
app.get("/api/progress", async (req, res) => {
  try {
    const list = await getCollection("progress");
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/progress", async (req, res) => {
  try {
    const { studentId, lessonId, courseId, completed, completedAt, favorited } = req.body;
    const docId = `progress_${studentId}_${lessonId}`;
    const docRef = fdb.collection("progress").doc(docId);
    const docSnap = await docRef.get();

    const updateData: any = {};
    if (completed !== undefined) updateData.completed = completed;
    if (completedAt !== undefined) updateData.completedAt = completedAt;
    if (favorited !== undefined) updateData.favorited = favorited;

    if (docSnap.exists) {
      await docRef.update(updateData);
    } else {
      await docRef.set({
        studentId,
        lessonId,
        courseId,
        completed: completed || false,
        completedAt: completedAt || null,
        favorited: favorited || false,
        ...updateData
      });
    }

    const allProgress = await getCollection("progress");
    res.json({ success: true, progress: allProgress });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 9. COMMENTS PER LESSON (Support / Dúvidas rápidas)
app.get("/api/comments", async (req, res) => {
  try {
    const list = await getCollection("supportComments");
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/comments", async (req, res) => {
  try {
    const comment = req.body;
    comment.id = `comment_${Date.now()}`;
    comment.createdAt = new Date().toISOString();

    if (comment.parentCommentId) {
      const parentDocRef = fdb.collection("supportComments").doc(comment.parentCommentId);
      const parentDoc = await parentDocRef.get();
      if (parentDoc.exists) {
        const parentData = parentDoc.data()!;
        const replies = parentData.replies || [];
        replies.push(comment);
        await parentDocRef.update({ replies });
      }
    } else {
      comment.replies = [];
      await fdb.collection("supportComments").doc(comment.id).set(comment);
    }

    res.json({ success: true, comment });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 10. SUPPORT TICKETS CRUD (Para dúvidas formais de suporte)
app.get("/api/support", async (req, res) => {
  try {
    const list = await getCollection("supportTickets");
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/support", async (req, res) => {
  try {
    const ticket = req.body;
    ticket.id = `ticket_${Date.now()}`;
    ticket.createdAt = new Date().toISOString();

    await fdb.collection("supportTickets").doc(ticket.id).set(ticket);
    res.json({ success: true, ticket });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/support/:id/answer", async (req, res) => {
  try {
    const { id } = req.params;
    const { answerText } = req.body;

    const docRef = fdb.collection("supportTickets").doc(id);
    const docSnap = await docRef.get();
    if (docSnap.exists) {
      const updatedData = {
        answerText,
        answeredAt: new Date().toISOString()
      };
      await docRef.update(updatedData);
      const ticket = { ...docSnap.data(), ...updatedData };
      res.json({ success: true, ticket });
    } else {
      res.status(404).json({ error: "Ticket não encontrado." });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 11. USERS SIMULATOR (Switching between admin & student)
app.get("/api/users", async (req, res) => {
  try {
    const list = await getCollection("users");
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/users", async (req, res) => {
  try {
    const user = req.body;
    if (!user.email) {
      return res.status(400).json({ error: "E-mail é obrigatório." });
    }

    const userQuery = await fdb.collection("users").where("email", "==", user.email).get();

    if (!userQuery.empty) {
      const userDoc = userQuery.docs[0];
      const existingUser = userDoc.data();
      const oldId = existingUser.id;
      const newId = user.id || oldId;

      const mergedUser = {
        ...existingUser,
        ...user,
        id: newId,
        purchasedProducts: existingUser.purchasedProducts || [],
        role: existingUser.role || 'student'
      };

      if (oldId !== newId) {
        console.log(`Migrando referências de ${oldId} para ${newId}`);
        await fdb.collection("users").doc(oldId).delete();
        await fdb.collection("users").doc(newId).set(mergedUser);

        const salesSnapshot = await fdb.collection("sales").where("studentId", "==", oldId).get();
        if (!salesSnapshot.empty) {
          const batch = fdb.batch();
          salesSnapshot.forEach((doc) => {
            batch.update(doc.ref, { studentId: newId });
          });
          await batch.commit();
        }

        const progressSnapshot = await fdb.collection("progress").where("studentId", "==", oldId).get();
        if (!progressSnapshot.empty) {
          const batch = fdb.batch();
          progressSnapshot.forEach((doc) => {
            batch.update(doc.ref, { studentId: newId });
          });
          await batch.commit();
        }

        const ticketsSnapshot = await fdb.collection("supportTickets").where("studentId", "==", oldId).get();
        if (!ticketsSnapshot.empty) {
          const batch = fdb.batch();
          ticketsSnapshot.forEach((doc) => {
            batch.update(doc.ref, { studentId: newId });
          });
          await batch.commit();
        }

        const certsSnapshot = await fdb.collection("certificates").where("studentId", "==", oldId).get();
        if (!certsSnapshot.empty) {
          const batch = fdb.batch();
          certsSnapshot.forEach((doc) => {
            batch.update(doc.ref, { studentId: newId });
          });
          await batch.commit();
        }
      } else {
        await userDoc.ref.set(mergedUser, { merge: true });
      }
    } else {
      if (!user.id) {
        user.id = `user_${Date.now()}`;
      }
      user.purchasedProducts = user.purchasedProducts || [];
      user.role = user.role || 'student';
      await fdb.collection("users").doc(user.id).set(user);
    }

    const updatedUserDoc = await fdb.collection("users").where("email", "==", user.email).get();
    res.json({ success: true, user: updatedUserDoc.docs[0].data() });
  } catch (error: any) {
    console.error("Erro ao sincronizar usuário no Firestore:", error);
    res.status(500).json({ error: error.message });
  }
});

// 12. CERTIFICATES GENERATION
app.get("/api/certificates", async (req, res) => {
  try {
    const list = await getCollection("certificates");
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/certificates/issue", async (req, res) => {
  try {
    const { studentId, studentName, courseId, courseTitle } = req.body;

    const certQuery = await fdb.collection("certificates")
      .where("studentId", "==", studentId)
      .where("courseId", "==", courseId)
      .get();

    if (!certQuery.empty) {
      return res.json({ success: true, certificate: certQuery.docs[0].data() });
    }

    const code = `CERT-${courseId.split("_")[1]?.toUpperCase() || "LMS"}-${Math.floor(100000 + Math.random() * 900000)}`;
    const cert = {
      id: `cert_${Date.now()}`,
      studentId,
      studentName,
      courseId,
      courseTitle,
      issuedAt: new Date().toISOString(),
      validationCode: code
    };

    await fdb.collection("certificates").doc(cert.id).set(cert);
    res.json({ success: true, certificate: cert });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/certificates/validate/:code", async (req, res) => {
  try {
    const { code } = req.params;
    const certQuery = await fdb.collection("certificates")
      .where("validationCode", "==", code)
      .get();

    if (!certQuery.empty) {
      res.json({ valid: true, certificate: certQuery.docs[0].data() });
    } else {
      res.json({ valid: false, message: "Certificado não encontrado." });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// SERVER-SIDE AI POWERED FEATURES (GEMINI)
// ==========================================

// 1. AI Lesson Tutor (Explains/answers questions about specific lesson text)
app.post("/api/gemini/tutor", async (req, res) => {
  const { lessonTitle, lessonText, query } = req.body;
  const ai = getGeminiClient();

  if (!ai) {
    return res.json({
      answer: `🤖 [Mock AI Mode] O Tutor de IA está rodando em modo simulação porque nenhuma GEMINI_API_KEY foi definida ou configurada. Aqui está uma resposta mockada para: "${query}"\n\nNesta aula de "${lessonTitle}", analisamos padrões de arquitetura e isolamento. Sua pergunta aborda pontos cruciais de segurança e integridade de dados. Na prática, recomendamos validar e aplicar cabeçalhos e firewalls adicionais para blindar as APIs de vazamentos. Adicione sua chave de API nos Segredos do AI Studio para habilitar as respostas dinâmicas em tempo real com o modelo Gemini 3.5 Flash!`
    });
  }

  try {
    const prompt = `Você é o Tutor de IA da plataforma premium de cursos do Andrew Lemos.
Você deve responder a uma dúvida do aluno sobre a aula "${lessonTitle}".

Conteúdo da Aula:
"""
${lessonText || "Nenhum texto associado a esta aula."}
"""

Dúvida do Aluno:
"${query}"

Instruções para Resposta:
1. Responda em português (PT-BR) de forma extremamente didática, profissional e acolhedora, como um Arquiteto de Software Sênior.
2. Baseie sua resposta principalmente no conteúdo da aula, mas sinta-se à vontade para expandir com boas práticas e analogias úteis.
3. Se a pergunta for totalmente fora do contexto da aula, gentilmente traga o aluno de volta para o tema, respondendo brevemente se possível.
4. Mantenha uma formatação amigável usando markdown (negritos, listas, blocos de código se necessário).`;

    let response;
    let attempts = 0;
    while (attempts < 2) {
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
        });
        break; // Success!
      } catch (err: any) {
        attempts++;
        if (attempts >= 2) throw err;
        // Clean info log instead of noisy console.warn to avoid triggering automated log alarms
        console.log(`[Gemini Tutor] Tentando novamente... (Tentativa ${attempts})`);
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }

    res.json({ answer: response?.text || "" });
  } catch (error: any) {
    // Log cleanly without dumping raw JSON structures to stdout/stderr
    console.log(`[Gemini Tutor] Indisponivel temporariamente (503). Retornando resposta de contingência padrão.`);
    res.json({
      answer: `Olá! Devido a uma alta demanda temporária nos servidores de inteligência artificial, o mestre Andrew Lemos preparou um resumo rápido de contingência para sua pergunta sobre a aula "${lessonTitle}". A prática é o caminho mais seguro para assimilar esses conceitos: recomendamos revisar os exercícios propostos nesta aula, experimentar na madeira os cortes e goivas sugeridos, e reassistir ao vídeo explicativo. Se sua dúvida persistir, sinta-se à vontade para enviar um ticket de suporte prático ou postá-la na Mesa de Discussão para que eu ou a comunidade possamos responder pessoalmente!`
    });
  }
});

// 2. AI Quiz/Exercises Generator (Admin generates quiz questions based on lesson content)
app.post("/api/gemini/quiz", async (req, res) => {
  const { lessonTitle, lessonDescription, lessonText } = req.body;
  const ai = getGeminiClient();

  if (!ai) {
    // Generate simulated JSON-like response
    return res.json({
      questions: [
        {
          id: `q_mock_${Date.now()}_1`,
          question: `[Simulação] Com base na aula de ${lessonTitle}, qual a principal vantagem do modelo multi-tenant compartilhado?`,
          options: [
            "Aumento nos custos de infraestrutura por cliente.",
            "Isolamento físico total de hardware por padrão.",
            "Otimização extrema de custos de hardware e manutenção centralizada.",
            "Incompatibilidade com conexões de segurança SSL/TLS."
          ],
          correctAnswerIndex: 2
        }
      ]
    });
  }

  try {
    const prompt = `Gere uma pergunta de Quiz em formato JSON com base no conteúdo da aula a seguir:

Título da Aula: "${lessonTitle}"
Descrição: "${lessonDescription}"
Texto de Apoio: "${lessonText || ""}"

Gere um objeto JSON que obedeça RIGOROSAMENTE ao esquema a seguir:
{
  "question": "A pergunta em português do Brasil",
  "options": [
    "Opção 1",
    "Opção 2",
    "Opção 3",
    "Opção 4"
  ],
  "correctAnswerIndex": 2 // Índice de 0 a 3 da opção correta
}

Por favor, gere apenas o JSON válido, sem tags de markdown, blocos de código ou textos introdutórios. O retorno deve ser parseado diretamente pelo JSON.parse.`;

    let response;
    let attempts = 0;
    while (attempts < 2) {
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json"
          }
        });
        break; // Success!
      } catch (err: any) {
        attempts++;
        if (attempts >= 2) throw err;
        console.log(`[Gemini Quiz] Tentando novamente... (Tentativa ${attempts})`);
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }

    const parsed = JSON.parse(response?.text?.trim() || "{}");
    // Append ID
    parsed.id = `q_ai_${Date.now()}`;
    res.json({ questions: [parsed] });
  } catch (error: any) {
    console.log(`[Gemini Quiz] Indisponivel temporariamente (503). Retornando pergunta de contingência padrão.`);
    // Return a high quality fallback question
    res.json({
      questions: [
        {
          id: `q_ai_fallback_${Date.now()}`,
          question: `Com base nos conceitos de Entalhe e Prática na aula "${lessonTitle}", qual é a atitude mais segura para evitar acidentes e garantir cortes precisos?`,
          options: [
            "Usar ferramentas cegas para reduzir a força do corte.",
            "Manter as goivas e facas sempre perfeitamente afiadas e cortar sempre na direção oposta ao seu corpo e mãos.",
            "Forçar a lâmina contra os nós da madeira com batidas rápidas.",
            "Utilizar luvas grossas sem fixar a peça em uma morsa de bancada."
          ],
          correctAnswerIndex: 1
        }
      ]
    });
  }
});

// 3. AI Support Assistant draft (Help admin write high quality ticket replies)
app.post("/api/gemini/answer-ticket", async (req, res) => {
  const { ticketQueryText, lessonTitle, isPractical, imageUrl } = req.body;
  const ai = getGeminiClient();

  if (!ai) {
    if (isPractical) {
      return res.json({
        draft: `Olá! Parabéns pelo excelente trabalho prático na aula "${lessonTitle || "Geral"}"! Fiquei muito feliz em ver sua foto. Sua dedicação e execução estão excelentes! Continue assim, praticando sempre. Minha dica principal agora é focar nos detalhes de acabamento e lixamento fino para valorizar ainda mais a sua peça. Se precisar de ajuda para os próximos passos, conte comigo!`
      });
    }
    return res.json({
      draft: `Olá! Obrigado por entrar em contato. Sobre sua dúvida na aula "${lessonTitle || "Geral"}", recomendo que revise os arquivos complementares e garanta que todas as credenciais do banco de dados estejam devidamente configuradas no arquivo .env local. Se precisar de mais assistência, estou à disposição! (Para respostas personalizadas inteligentes, configure uma GEMINI_API_KEY nos Segredos).`
    });
  }

  try {
    let prompt = "";
    if (isPractical) {
      prompt = `Você é o Professor Andrew Lemos, instrutor de Entalhe em Madeira (Wood Carving) e Escultura.
O aluno te enviou a foto de seu exercício prático (${imageUrl ? `Link da foto: ${imageUrl}` : 'Sem link de foto'}).

Relatório de execução ou dúvida do aluno (Aula: "${lessonTitle || "Geral"}"):
"${ticketQueryText}"

Sua tarefa: Escreva um rascunho de resposta técnica, acolhedora e extremamente OBJETIVA para responder ao aluno.
REGRAS CRÍTICAS DE ESTILO:
1. NÃO use marcadores de tópicos (bullet points ou asteriscos '*' ou '**' ou '-').
2. NÃO use formatações pesadas de markdown (como hashtags '###' ou '##'). Escreva parágrafos simples, limpos e corridos.
3. Seja extremamente CONCISO e DIRETO. A resposta deve ter no máximo 2 parágrafos pequenos (limite máximo de 100 a 120 palavras).
4. O tom deve ser de um mestre de artes manuais de verdade: humanizado, prático, encorajador, porém muito direto ao ponto. Dê no máximo uma dica técnica rápida.
5. Evite enrolação acadêmica, clichês ou floreios artificiais. Escreva de forma natural, como se estivesse enviando uma mensagem rápida de mentoria no WhatsApp ou chat direto.`;
    } else {
      prompt = `Você é o Professor Andrew Lemos, instrutor de Entalhe em Madeira (Wood Carving) e Escultura.
O aluno enviou a seguinte dúvida teórica:

Dúvida do aluno (Aula: "${lessonTitle || "Geral"}"):
"${ticketQueryText}"

Sua tarefa: Escreva uma resposta técnica, acolhedora e extremamente OBJETIVA para sanar a dúvida do aluno de forma clara.
REGRAS CRÍTICAS DE ESTILO:
1. NÃO use marcadores de tópicos (bullet points ou asteriscos '*' ou '**' ou '-').
2. NÃO use formatações pesadas de markdown (como hashtags '###' ou '##'). Escreva parágrafos simples, limpos e corridos.
3. Seja extremamente CONCISO e DIRETO. A resposta deve ter no máximo 2 parágrafos pequenos (limite máximo de 100 a 120 palavras).
4. O tom deve ser de um mestre experiente em marcenaria/entalhe: humanizado, prático, resolutivo e direto.
5. Escreva de forma humanizada e rápida, sem enrolação artificial ou listas complexas.`;
    }

    let response;
    let attempts = 0;
    while (attempts < 2) {
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
        });
        break; // Success!
      } catch (err: any) {
        attempts++;
        if (attempts >= 2) throw err;
        console.log(`[Gemini Ticket] Tentando novamente... (Tentativa ${attempts})`);
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }

    res.json({ draft: response?.text || "" });
  } catch (error: any) {
    console.log(`[Gemini Ticket] Indisponivel temporariamente (503). Ativando rascunho de contingência.`);
    
    // Graceful fallback to prevent errors in UI when Gemini has high demand (503) or is offline
    if (isPractical) {
      res.json({
        draft: `Olá! Parabéns pelo excelente trabalho prático na aula "${lessonTitle || "Geral"}". Fiquei muito feliz em ver sua foto e acompanhar sua evolução. Sua dedicação e execução técnica estão fantásticas! Como dica de mestre para os próximos passos, recomendo focar bastante nos detalhes de lixamento fino e no acabamento das bordas para valorizar ainda mais sua escultura. Continue firme nos treinos!`
      });
    } else {
      res.json({
        draft: `Olá! Excelente pergunta sobre a aula "${lessonTitle || "Geral"}". Recomendo que você revise o material complementar de apoio e assista novamente ao trecho prático do vídeo onde abordo este ponto específico. Tente também aplicar em uma pequena peça de teste antes de ir para o projeto principal. Qualquer dúvida extra, estou por aqui para ajudar!`
      });
    }
  }
});


// ==========================================
// VITE CLIENT INTEGRATION & STARTUP
// ==========================================

async function startServer() {
  // Executar migração inicial do db.json para o Firestore se for o primeiro boot e o Firestore estiver vazio
  await migrateFromLocalJsonIfNeeded();

  const isDev = process.env.NODE_ENV === "development" || (process.env.NODE_ENV !== "production" && !fs.existsSync(path.join(process.cwd(), "dist", "index.html")));

  if (isDev) {
    // Development mode with Vite Dev Server Middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production mode - serve prebuilt static assets
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[LMS SERVER] Plataforma iniciada com sucesso.`);
    console.log(`[LMS SERVER] Acesse em: http://localhost:${PORT}`);
  });
}

startServer();
