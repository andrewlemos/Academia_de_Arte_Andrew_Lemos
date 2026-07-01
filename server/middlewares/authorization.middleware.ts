import { Request, Response, NextFunction } from "express";
import { ForbiddenError, UnauthorizedError } from "../utils/errors";
import { AuthorizationService } from "../modules/auth/services/AuthorizationService";
import { Logger } from "../utils/logger";

/**
 * Factory middleware to require a specific granular permission.
 * e.g., requirePermission("courses.create")
 */
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      if (!user) {
        throw new UnauthorizedError("Usuário não autenticado no contexto da requisição");
      }

      const hasAccess = AuthorizationService.matchPermission(user.permissions, permission);

      if (!hasAccess) {
        Logger.warn(`Acesso negado: Usuário ${user.email} tentou acessar recurso sem permissão '${permission}'`);
        throw new ForbiddenError(`Você não tem permissão para realizar esta ação (${permission})`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
