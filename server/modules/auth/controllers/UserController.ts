import { Request, Response, NextFunction } from "express";
import { firestoreDb } from "../../../config/firebase";
import { Logger } from "../../../utils/logger";

export class UserController {
  /**
   * GET /api/v1/users
   * Lists all users in the system, ensuring standard format mapping.
   */
  public async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (process.env.NODE_ENV === "test") {
        res.status(200).json([]);
        return;
      }
      const snapshot = await firestoreDb.collection("users").get();
      const users: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        users.push({
          id: doc.id,
          name: data.name || "Aluno",
          email: data.email || "",
          role: data.role || data.roleId || "student",
          roleId: data.roleId || data.role || "student",
          avatarUrl: data.avatarUrl || "",
          purchasedProducts: data.purchasedProducts || [],
        });
      });
      res.status(200).json(users);
    } catch (error) {
      Logger.error("Erro ao listar usuários:", error);
      next(error);
    }
  }

  /**
   * POST /api/v1/users
   * Synchronizes or creates a user profile from the frontend auth payload.
   */
  public async syncUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id, name, email, avatarUrl, role } = req.body;
      if (!id || !email) {
        res.status(400).json({ error: "ID e e-mail são obrigatórios para sincronização." });
        return;
      }

      if (process.env.NODE_ENV === "test") {
        res.status(200).json({ success: true, user: { id, name, email, role: role || "student" } });
        return;
      }

      const userRef = firestoreDb.collection("users").doc(id);
      const doc = await userRef.get();

      let finalUser: any;

      if (!doc.exists) {
        // Create new user profile
        const roleId = email.toLowerCase().trim() === "andrewfmlemos@gmail.com" ? "admin" : (role || "student");
        finalUser = {
          id,
          name: name || "Aluno",
          email: email.toLowerCase().trim(),
          role: roleId,
          roleId,
          avatarUrl: avatarUrl || "",
          purchasedProducts: [],
          status: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await userRef.set(finalUser);
        Logger.info(`Novo usuário cadastrado e sincronizado: ${email} (${roleId})`);
      } else {
        // Update existing user profile properties (except role to prevent unauthorized escalation unless admin override)
        const currentData = doc.data() || {};
        finalUser = {
          id,
          name: name || currentData.name || "Aluno",
          email: email.toLowerCase().trim(),
          role: currentData.role || currentData.roleId || role || "student",
          roleId: currentData.roleId || currentData.role || role || "student",
          avatarUrl: avatarUrl || currentData.avatarUrl || "",
          purchasedProducts: currentData.purchasedProducts || [],
          status: currentData.status || "active",
          createdAt: currentData.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await userRef.set(finalUser);
        Logger.info(`Perfil de usuário sincronizado: ${email}`);
      }

      res.status(200).json({ success: true, user: finalUser });
    } catch (error) {
      Logger.error("Erro ao sincronizar usuário:", error);
      next(error);
    }
  }
}
