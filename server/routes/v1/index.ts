import { Router } from "express";
import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import { execSync } from "child_process";
import { getDatabaseProvider } from "../../config/firebase";

// Import existing modules
import authRouter from "../../modules/auth/routes";
import courseRouter from "../../modules/course/routes";

// Import newly migrated modules
import handoutRouter from "../../modules/handout/routes";
import salesRouter from "../../modules/sales/routes";
import supportRouter from "../../modules/support/routes";
import certificateRouter from "../../modules/certificate/routes";
import geminiRouter from "../../modules/gemini/routes";

// Import Controllers for direct mapping
import { UserController } from "../../modules/auth/controllers/UserController";
import { CourseController } from "../../modules/course/controllers/CourseController";
import { authenticate } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/authorization.middleware";

const router = Router();
const userController = new UserController();
const courseController = new CourseController();

// --- Health Check ---
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: "UP",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

 // --- Infrastructure Utilities (Migrated download endpoints) ---
router.get("/download-zip", (req, res) => {
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

router.get("/download-project", (req, res) => {
  try {
    const archivePath = path.join("/tmp", `academiadearte-project-${Date.now()}.tar.gz`);
    // Compress workspace excluding node_modules, dist, etc.
    execSync(`tar --exclude='node_modules' --exclude='.git' --exclude='dist' -czf ${archivePath} .`);
    res.download(archivePath, "academiadearte-project.tar.gz", (err) => {
      try {
        if (fs.existsSync(archivePath)) {
          fs.unlinkSync(archivePath);
        }
      } catch (cleanupErr) {
        console.error("Erro ao limpar arquivo tar.gz temporário:", cleanupErr);
      }
    });
  } catch (err: any) {
    console.error("Erro ao criar pacote tar.gz:", err);
    res.status(500).send("Erro ao criar pacote tar.gz: " + err.message);
  }
});

// --- Auth & Users ---
router.use("/auth", authRouter);

router.get("/users", authenticate, requirePermission("users.read"), (req, res, next) => userController.listUsers(req, res, next));
router.post("/users", (req, res, next) => userController.syncUser(req, res, next));

// Direct admin override routes for User Management
router.put("/users/:id", authenticate, requirePermission("users.update"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = getDatabaseProvider();
    await db.collection("users").doc(id).set(req.body, { merge: true });
    res.status(200).json({ success: true, message: "Usuário atualizado com sucesso." });
  } catch (error) {
    next(error);
  }
});

router.delete("/users/:id", authenticate, requirePermission("users.update"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = getDatabaseProvider();
    await db.collection("users").doc(id).delete();
    res.status(200).json({ success: true, message: "Usuário excluído com sucesso." });
  } catch (error) {
    next(error);
  }
});

// --- Courses ---
router.use("/courses", courseRouter);

// --- Modules Direct Mapping ---
router.get("/modules", (req, res, next) => courseController.listModules(req, res, next));
router.post("/modules", (req, res, next) => courseController.createModule(req, res, next));
router.delete("/modules/:id", (req, res, next) => courseController.deleteModule(req, res, next));

// --- Lessons Direct Mapping ---
router.get("/lessons", (req, res, next) => courseController.listLessons(req, res, next));
router.post("/lessons", (req, res, next) => courseController.createLesson(req, res, next));
router.delete("/lessons/:id", (req, res, next) => courseController.deleteLesson(req, res, next));

// --- Student Progress Direct Mapping ---
router.get("/progress", (req, res, next) => courseController.getProgress(req, res, next));
router.post("/progress", (req, res, next) => courseController.saveProgress(req, res, next));

// --- Comments Direct Mapping ---
router.get("/comments", (req, res, next) => courseController.getComments(req, res, next));
router.post("/comments", (req, res, next) => courseController.createComment(req, res, next));

router.delete("/comments/:id", authenticate, requirePermission("support.update"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = getDatabaseProvider();
    
    // 1. Delete main comment
    await db.collection("comments").doc(id).delete();
    
    // 2. Also search all main comments to see if this ID is a reply and remove it
    const snapshot = await db.collection("comments").get();
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const replies = data.replies || [];
      const hasReply = replies.some((r: any) => r.id === id);
      if (hasReply) {
        const filteredReplies = replies.filter((r: any) => r.id !== id);
        await doc.ref.update({ replies: filteredReplies });
      }
    }
    
    res.status(200).json({ success: true, message: "Comentário excluído com sucesso." });
  } catch (error) {
    next(error);
  }
});

// --- Handouts (Apostilas) ---
router.use("/apostilas", handoutRouter);

// --- Sales, Checkout & Coupons ---
router.use("/sales", salesRouter);

// Custom override routes for Sales Management
router.put("/sales/:id", authenticate, requirePermission("users.update"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = getDatabaseProvider();
    await db.collection("sales").doc(id).set(req.body, { merge: true });
    res.status(200).json({ success: true, message: "Venda atualizada com sucesso." });
  } catch (error) {
    next(error);
  }
});

router.delete("/sales/:id", authenticate, requirePermission("users.update"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = getDatabaseProvider();
    await db.collection("sales").doc(id).delete();
    res.status(200).json({ success: true, message: "Venda excluída com sucesso." });
  } catch (error) {
    next(error);
  }
});

router.use("/coupons", (req, res, next) => {
  // salesRouter already maps GET /coupons and /coupons/:id
  next();
}, salesRouter);

// --- Support Tickets ---
router.use("/support", supportRouter);

// --- Certificates ---
router.use("/certificates", certificateRouter);

router.delete("/certificates/:id", authenticate, requirePermission("certificates.issue"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = getDatabaseProvider();
    await db.collection("certificates").doc(id).delete();
    res.status(200).json({ success: true, message: "Certificado excluído com sucesso." });
  } catch (error) {
    next(error);
  }
});

// --- Gemini AI Tutor, Quiz, and Answers ---
router.use("/gemini", geminiRouter);

export default router;
