import { Request, Response, NextFunction } from "express";
import { AuthService } from "../modules/auth/services/AuthService";
import { AuthorizationService } from "../modules/auth/services/AuthorizationService";
import { UserRepository } from "../modules/auth/repositories/UserRepository";
import { UnauthorizedError } from "../utils/errors";
import { Logger } from "../utils/logger";

const authService = new AuthService();
const authorizationService = new AuthorizationService();
const userRepository = new UserRepository();

/**
 * Middleware to authenticate incoming requests via Firebase JWT.
 * Extracts the token from the Authorization header or cookies/query, verifies it,
 * syncs the user if needed, and loads their role and resolved permissions.
 */
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    let token: string | undefined;

    // 1. Extract from Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }

    // 2. Fallback to query parameter (useful for testing or specific file streams)
    if (!token && req.query.token) {
      token = req.query.token as string;
    }

    if (!token) {
      throw new UnauthorizedError("Token de autenticação não fornecido");
    }

    // Verify token
    const decoded = await authService.verifyToken(token);

    // Sync or retrieve user in our Firestore database
    const user = await authService.syncUser(decoded.uid, decoded.email, decoded.name);

    if (user.status === "inactive") {
      throw new UnauthorizedError("Esta conta de usuário foi desativada");
    }

    // Resolve user's permissions
    const permissions = await authorizationService.resolveUserPermissions(user.id);

    // Attach user payload to request
    (req as any).user = {
      id: user.id,
      email: user.email,
      name: user.name,
      roleId: user.roleId,
      permissions,
    };

    next();
  } catch (error: any) {
    Logger.warn("Erro de autenticação no middleware:", { message: error.message });
    next(error);
  }
}
