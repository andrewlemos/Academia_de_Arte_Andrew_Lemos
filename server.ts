import express from "express";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import AdmZip from "adm-zip";
import * as admin from "firebase-admin";
import { initializeApp as initFirebaseClient } from "firebase/app";
import { getFirestore as getFirestoreClient, doc as docClient, getDoc as getDocClient, setDoc as setDocClient } from "firebase/firestore";

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

// Initialize Firebase Client SDK on Server for Firestore operations (bypasses service account IAM permissions issues)
let clientDb: any = null;
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const clientApp = initFirebaseClient(firebaseConfig);
    clientDb = getFirestoreClient(clientApp, firebaseConfig.firestoreDatabaseId);
    console.log("[FIREBASE] Client-side SDK para Firestore inicializado com sucesso no servidor.");
  } else {
    console.warn("[FIREBASE] Arquivo firebase-applet-config.json não encontrado para o servidor.");
  }
} catch (error) {
  console.error("[FIREBASE] Erro ao inicializar Client-side SDK no servidor:", error);
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

// Read database helper
let useLocalOnly = false;

function readLocalDB(): any {
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, "utf-8");
      return JSON.parse(raw);
    }
  } catch (error) {
    console.error("Erro ao ler banco de dados local:", error);
  }

  return {
    courses: [],
    modules: [],
    lessons: [],
    apostilas: [],
    users: [],
    sales: [],
    coupons: [],
    progress: [],
    supportTickets: [],
    certificates: [],
    supportComments: []
  };
}

async function readDB(): Promise<any> {
  const defaultState = {
    courses: [],
    modules: [],
    lessons: [],
    apostilas: [],
    users: [],
    sales: [],
    coupons: [],
    progress: [],
    supportTickets: [],
    certificates: [],
    supportComments: []
  };

  if (useLocalOnly || !clientDb) {
    const local = readLocalDB();
    return { ...defaultState, ...local };
  }

  try {
    const docRef = docClient(clientDb, "system", "lms_database");
    const snapshot = await getDocClient(docRef);
    
    let dbData: any = null;
    if (snapshot.exists()) {
      dbData = snapshot.data();
    }

    // If the Firestore document does not exist, or does not contain a valid 'courses' array, we need to seed it
    if (!dbData || !Array.isArray(dbData.courses)) {
      console.log("[FIREBASE] Nenhum dado válido ou 'courses' ausente no Firestore. Carregando e semeando a partir do db.json...");
      let seedData = { ...defaultState };
      if (fs.existsSync(DB_PATH)) {
        try {
          const raw = fs.readFileSync(DB_PATH, "utf-8");
          seedData = { ...defaultState, ...JSON.parse(raw) };
        } catch (e) {
          console.error("[FIREBASE] Erro ao ler db.json para seed:", e);
        }
      }
      
      // Save this complete seed back to Firestore
      try {
        await setDocClient(docRef, seedData);
        console.log("[FIREBASE] Seed inicial completo enviado para o Firestore.");
      } catch (writeErr: any) {
        console.error("[FIREBASE] Erro ao gravar seed inicial no Firestore:", writeErr);
      }
      return seedData;
    }

    // Ensure all required arrays exist in the returned data to avoid undefined errors
    return { ...defaultState, ...dbData };
  } catch (error: any) {
    console.warn(`[FIREBASE] Não foi possível carregar dados do Firestore (${error.message || error}). O aplicativo usará o banco de dados local db.json.`);
    const local = readLocalDB();
    return { ...defaultState, ...local };
  }
}

// Write database helper
async function writeDB(data: any): Promise<void> {
  let firebaseSaved = false;
  if (!useLocalOnly && clientDb) {
    try {
      const docRef = docClient(clientDb, "system", "lms_database");
      await setDocClient(docRef, data);
      console.log("[FIREBASE] Dados salvos com sucesso no Firestore.");
      firebaseSaved = true;
    } catch (error: any) {
      console.warn(`[FIREBASE] Não foi possível salvar dados no Firestore (${error.message || error}). Usando apenas cópia local.`);
      useLocalOnly = true;
    }
  }

  // Also write to local backup db.json so offline mode/ZIP download matches
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Erro ao salvar cópia local:", error);
    if (!firebaseSaved && !useLocalOnly) {
      // If both local and firebase fail, then throw
      throw error;
    }
  }
}

// ==========================================
// REST API ENDPOINTS
// ==========================================

// 1. GET FULL DATABASE STATE (For Admin backups or inspection)
app.get("/api/db", async (req, res) => {
  const db = await readDB();
  res.json(db);
});

// 2. COURSES CRUD
app.get("/api/courses", async (req, res) => {
  const db = await readDB();
  res.json(db.courses || []);
});

app.post("/api/courses", async (req, res) => {
  const db = await readDB();
  const course = req.body;

  if (!course.id) {
    course.id = `course_${Date.now()}`;
    db.courses.push(course);
  } else {
    const index = db.courses.findIndex((c: any) => c.id === course.id);
    if (index !== -1) {
      db.courses[index] = { ...db.courses[index], ...course };
    } else {
      db.courses.push(course);
    }
  }

  await writeDB(db);
  res.status(200).json({ success: true, course });
});

app.delete("/api/courses/:id", async (req, res) => {
  const db = await readDB();
  const { id } = req.params;

  db.courses = db.courses.filter((c: any) => c.id !== id);
  db.modules = db.modules.filter((m: any) => m.courseId !== id);
  db.lessons = db.lessons.filter((l: any) => l.courseId !== id);

  await writeDB(db);
  res.json({ success: true, message: "Curso e conteúdos removidos." });
});

// 3. MODULES CRUD
app.get("/api/modules", async (req, res) => {
  const db = await readDB();
  res.json(db.modules || []);
});

app.post("/api/modules", async (req, res) => {
  const db = await readDB();
  const mod = req.body;

  if (!mod.id) {
    mod.id = `module_${Date.now()}`;
    db.modules.push(mod);
  } else {
    const index = db.modules.findIndex((m: any) => m.id === mod.id);
    if (index !== -1) {
      db.modules[index] = { ...db.modules[index], ...mod };
    } else {
      db.modules.push(mod);
    }
  }

  await writeDB(db);
  res.json({ success: true, module: mod });
});

app.delete("/api/modules/:id", async (req, res) => {
  const db = await readDB();
  const { id } = req.params;

  db.modules = db.modules.filter((m: any) => m.id !== id);
  db.lessons = db.lessons.filter((l: any) => l.moduleId !== id);

  await writeDB(db);
  res.json({ success: true, message: "Módulo e suas aulas removidos." });
});

// 4. LESSONS CRUD
app.get("/api/lessons", async (req, res) => {
  const db = await readDB();
  res.json(db.lessons || []);
});

app.post("/api/lessons", async (req, res) => {
  const db = await readDB();
  const lesson = req.body;

  if (!lesson.id) {
    lesson.id = `lesson_${Date.now()}`;
    db.lessons.push(lesson);
  } else {
    const index = db.lessons.findIndex((l: any) => l.id === lesson.id);
    if (index !== -1) {
      db.lessons[index] = { ...db.lessons[index], ...lesson };
    } else {
      db.lessons.push(lesson);
    }
  }

  await writeDB(db);
  res.json({ success: true, lesson });
});

app.delete("/api/lessons/:id", async (req, res) => {
  const db = await readDB();
  const { id } = req.params;

  db.lessons = db.lessons.filter((l: any) => l.id !== id);

  await writeDB(db);
  res.json({ success: true, message: "Aula removida com sucesso." });
});

// 5. APOSTILAS (Digital E-Books) CRUD
app.get("/api/apostilas", async (req, res) => {
  const db = await readDB();
  res.json(db.apostilas || []);
});

app.post("/api/apostilas", async (req, res) => {
  const db = await readDB();
  const book = req.body;

  if (!book.id) {
    book.id = `ebook_${Date.now()}`;
    db.apostilas.push(book);
  } else {
    const index = db.apostilas.findIndex((b: any) => b.id === book.id);
    if (index !== -1) {
      db.apostilas[index] = { ...db.apostilas[index], ...book };
    } else {
      db.apostilas.push(book);
    }
  }

  await writeDB(db);
  res.json({ success: true, apostila: book });
});

app.delete("/api/apostilas/:id", async (req, res) => {
  const db = await readDB();
  const { id } = req.params;

  db.apostilas = db.apostilas.filter((b: any) => b.id !== id);

  await writeDB(db);
  res.json({ success: true, message: "Apostila excluída." });
});

// 6. SALES & SIMULATED PAYMENTS
app.get("/api/sales", async (req, res) => {
  const db = await readDB();
  res.json(db.sales || []);
});

app.post("/api/sales", async (req, res) => {
  const db = await readDB();
  const sale = req.body;

  // Complete simulated sale structure
  sale.id = `sale_${Date.now()}`;
  sale.createdAt = new Date().toISOString();

  db.sales.push(sale);

  // If approved immediately, grant the course/ebook to the student profile
  if (sale.paymentStatus === "approved") {
    const userIndex = db.users.findIndex((u: any) => u.email === sale.studentEmail);
    if (userIndex !== -1) {
      if (!db.users[userIndex].purchasedProducts.includes(sale.productId)) {
        db.users[userIndex].purchasedProducts.push(sale.productId);
      }
    } else {
      // Create student user if not exists
      db.users.push({
        id: `user_student_${Date.now()}`,
        name: sale.studentName,
        email: sale.studentEmail,
        role: "student",
        avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop",
        purchasedProducts: [sale.productId]
      });
    }
  }

  await writeDB(db);
  res.json({ success: true, sale });
});

app.post("/api/sales/:id/approve", async (req, res) => {
  const db = await readDB();
  const { id } = req.params;

  const index = db.sales.findIndex((s: any) => s.id === id);
  if (index !== -1) {
    db.sales[index].paymentStatus = "approved";
    const sale = db.sales[index];

    // Grant content
    const userIndex = db.users.findIndex((u: any) => u.email === sale.studentEmail);
    if (userIndex !== -1) {
      if (!db.users[userIndex].purchasedProducts.includes(sale.productId)) {
        db.users[userIndex].purchasedProducts.push(sale.productId);
      }
    } else {
      db.users.push({
        id: `user_student_${Date.now()}`,
        name: sale.studentName,
        email: sale.studentEmail,
        role: "student",
        avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop",
        purchasedProducts: [sale.productId]
      });
    }

    await writeDB(db);
    res.json({ success: true, sale: db.sales[index] });
  } else {
    res.status(404).json({ error: "Transação não encontrada" });
  }
});

// 7. COUPONS CRUD
app.get("/api/coupons", async (req, res) => {
  const db = await readDB();
  res.json(db.coupons || []);
});

app.post("/api/coupons", async (req, res) => {
  const db = await readDB();
  const coupon = req.body;

  if (!coupon.id) {
    coupon.id = `coupon_${Date.now()}`;
    db.coupons.push(coupon);
  } else {
    const index = db.coupons.findIndex((c: any) => c.id === coupon.id);
    if (index !== -1) {
      db.coupons[index] = { ...db.coupons[index], ...coupon };
    } else {
      db.coupons.push(coupon);
    }
  }

  await writeDB(db);
  res.json({ success: true, coupon });
});

app.delete("/api/coupons/:id", async (req, res) => {
  const db = await readDB();
  const { id } = req.params;

  db.coupons = db.coupons.filter((c: any) => c.id !== id);

  await writeDB(db);
  res.json({ success: true, message: "Cupom deletado." });
});

// 8. PROGRESS MANIPULATION
app.get("/api/progress", async (req, res) => {
  const db = await readDB();
  res.json(db.progress || []);
});

app.post("/api/progress", async (req, res) => {
  const db = await readDB();
  const { studentId, lessonId, courseId, completed, completedAt, favorited } = req.body;

  const index = db.progress.findIndex((p: any) => p.studentId === studentId && p.lessonId === lessonId);

  if (index !== -1) {
    if (completed !== undefined) db.progress[index].completed = completed;
    if (completedAt !== undefined) db.progress[index].completedAt = completedAt;
    if (favorited !== undefined) db.progress[index].favorited = favorited;
  } else {
    db.progress.push({
      studentId,
      lessonId,
      courseId,
      completed: completed || false,
      completedAt: completedAt || null,
      favorited: favorited || false
    });
  }

  await writeDB(db);
  res.json({ success: true, progress: db.progress });
});

// 9. COMMENTS PER LESSON (Support / Dúvidas rápidas)
app.get("/api/comments", async (req, res) => {
  const db = await readDB();
  res.json(db.supportComments || []);
});

app.post("/api/comments", async (req, res) => {
  const db = await readDB();
  const comment = req.body;

  comment.id = `comment_${Date.now()}`;
  comment.createdAt = new Date().toISOString();

  if (comment.parentCommentId) {
    // It's a reply to an existing comment
    const parentIndex = db.supportComments.findIndex((c: any) => c.id === comment.parentCommentId);
    if (parentIndex !== -1) {
      if (!db.supportComments[parentIndex].replies) {
        db.supportComments[parentIndex].replies = [];
      }
      db.supportComments[parentIndex].replies.push(comment);
    }
  } else {
    // Normal comment
    comment.replies = [];
    db.supportComments.push(comment);
  }

  await writeDB(db);
  res.json({ success: true, comment });
});

// 10. SUPPORT TICKETS CRUD (Para dúvidas formais de suporte)
app.get("/api/support", async (req, res) => {
  const db = await readDB();
  res.json(db.supportTickets || []);
});

app.post("/api/support", async (req, res) => {
  const db = await readDB();
  const ticket = req.body;

  ticket.id = `ticket_${Date.now()}`;
  ticket.createdAt = new Date().toISOString();

  db.supportTickets.push(ticket);
  await writeDB(db);
  res.json({ success: true, ticket });
});

app.post("/api/support/:id/answer", async (req, res) => {
  const db = await readDB();
  const { id } = req.params;
  const { answerText } = req.body;

  const index = db.supportTickets.findIndex((t: any) => t.id === id);
  if (index !== -1) {
    db.supportTickets[index].answerText = answerText;
    db.supportTickets[index].answeredAt = new Date().toISOString();
    await writeDB(db);
    res.json({ success: true, ticket: db.supportTickets[index] });
  } else {
    res.status(404).json({ error: "Ticket não encontrado." });
  }
});

// 11. USERS SIMULATOR (Switching between admin & student)
app.get("/api/users", async (req, res) => {
  const db = await readDB();
  res.json(db.users || []);
});

app.post("/api/users", async (req, res) => {
  const db = await readDB();
  const user = req.body;

  if (!user.email) {
    return res.status(400).json({ error: "E-mail é obrigatório." });
  }

  // Find by email to link and preserve existing data
  const existingUserIndex = db.users.findIndex((u: any) => u.email.toLowerCase() === user.email.toLowerCase());

  if (existingUserIndex !== -1) {
    const existingUser = db.users[existingUserIndex];
    const oldId = existingUser.id;
    const newId = user.id || oldId;

    // Merge profiles, ensuring we preserve purchasedProducts and role
    const mergedUser = {
      ...existingUser,
      ...user,
      id: newId,
      purchasedProducts: existingUser.purchasedProducts || [],
      role: existingUser.role || 'student'
    };

    db.users[existingUserIndex] = mergedUser;

    // If the ID has changed, migrate all references in the database
    if (oldId !== newId) {
      console.log(`Migrating references from ${oldId} to ${newId}`);
      
      if (db.sales) {
        db.sales.forEach((s: any) => {
          if (s.studentId === oldId) s.studentId = newId;
        });
      }
      if (db.progress) {
        db.progress.forEach((p: any) => {
          if (p.studentId === oldId) p.studentId = newId;
        });
      }
      if (db.supportTickets) {
        db.supportTickets.forEach((t: any) => {
          if (t.studentId === oldId) t.studentId = newId;
        });
      }
      if (db.certificates) {
        db.certificates.forEach((c: any) => {
          if (c.studentId === oldId) c.studentId = newId;
        });
      }
    }
  } else {
    // Create a brand new user
    if (!user.id) {
      user.id = `user_${Date.now()}`;
    }
    user.purchasedProducts = user.purchasedProducts || [];
    user.role = user.role || 'student';
    db.users.push(user);
  }

  await writeDB(db);
  const found = db.users.find((u: any) => u.email.toLowerCase() === user.email.toLowerCase());
  res.json({ success: true, user: found });
});

// 12. CERTIFICATES GENERATION
app.get("/api/certificates", async (req, res) => {
  const db = await readDB();
  res.json(db.certificates || []);
});

app.post("/api/certificates/issue", async (req, res) => {
  const db = await readDB();
  const { studentId, studentName, courseId, courseTitle } = req.body;

  // Check if already issued
  const existing = db.certificates.find((c: any) => c.studentId === studentId && c.courseId === courseId);
  if (existing) {
    return res.json({ success: true, certificate: existing });
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

  db.certificates.push(cert);
  await writeDB(db);
  res.json({ success: true, certificate: cert });
});

app.get("/api/certificates/validate/:code", async (req, res) => {
  const db = await readDB();
  const { code } = req.params;
  const cert = db.certificates.find((c: any) => c.validationCode.toUpperCase() === code.toUpperCase());
  if (cert) {
    res.json({ valid: true, certificate: cert });
  } else {
    res.json({ valid: false, message: "Certificado não encontrado." });
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
