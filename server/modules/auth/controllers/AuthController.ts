import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/AuthService";
import { AuthorizationService } from "../services/AuthorizationService";
import { Role, Permission, User } from "../types";
import { BadRequestError, NotFoundError } from "../../../utils/errors";

export class AuthController {
  private authService = new AuthService();
  private authorizationService = new AuthorizationService();

  /**
   * GET /api/v1/auth/me
   * Returns current user with permissions
   */
  public async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      res.status(200).json({ user });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/sync
   * Snyc / create authenticated user from Firebase JWT
   */
  public async syncUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      res.status(200).json({
        message: "Usuário sincronizado com sucesso",
        user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/auth/users
   * Lists all users (requires users.read permission)
   */
  public async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await this.authService.listAllUsers();
      res.status(200).json(users);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/auth/users/:id/role
   * Updates user's role (requires users.update permission)
   */
  public async updateUserRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { roleId } = req.body;

      // Verify role exists
      const roleExists = await this.authorizationService.findRoleById(roleId);
      if (!roleExists) {
        throw new NotFoundError(`Cargo/Role '${roleId}' não encontrado`);
      }

      const updatedUser = await this.authService.updateUserRole(id, roleId);
      res.status(200).json({
        message: "Cargo do usuário atualizado com sucesso",
        user: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/auth/users/:id/status
   * Activates or deactivates a user (requires users.update permission)
   */
  public async updateUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (status !== "active" && status !== "inactive") {
        throw new BadRequestError("Status deve ser 'active' ou 'inactive'");
      }

      const updatedUser = await this.authService.updateUserStatus(id, status);
      res.status(200).json({
        message: `Usuário marcado como ${status === "active" ? "ativo" : "inativo"}`,
        user: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/roles
   * Creates a new role (requires roles.create permission)
   */
  public async createRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id, name, description } = req.body;

      const existing = await this.authorizationService.findRoleById(id);
      if (existing) {
        throw new BadRequestError(`Cargo/Role com ID '${id}' já existe`);
      }

      const newRole: Role = {
        id,
        name,
        description: description || "",
        isSystem: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const created = await this.authorizationService.createRole(newRole);
      res.status(201).json({
        message: "Cargo criado com sucesso",
        role: created,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/auth/roles
   * List all roles
   */
  public async listRoles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const roles = await this.authorizationService.listAllRoles();
      res.status(200).json(roles);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/permissions
   * Creates a new granular permission (requires permissions.create permission)
   */
  public async createPermission(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id, resource, action, description } = req.body;

      const existing = await this.authorizationService.findPermissionById(id);
      if (existing) {
        throw new BadRequestError(`Permissão com ID '${id}' já existe`);
      }

      const newPermission: Permission = {
        id,
        resource,
        action,
        description: description || "",
      };

      const created = await this.authorizationService.createPermission(newPermission);
      res.status(201).json({
        message: "Permissão granular criada com sucesso",
        permission: created,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/auth/permissions
   * List all permissions
   */
  public async listPermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const permissions = await this.authorizationService.listAllPermissions();
      res.status(200).json(permissions);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/roles/grant
   * Grants a permission to a role (requires roles.update permission)
   */
  public async grantRolePermission(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { roleId, permissionId } = req.body;

      // Verify role & permission exist
      const role = await this.authorizationService.findRoleById(roleId);
      if (!role) {
        throw new NotFoundError(`Cargo/Role com ID '${roleId}' não encontrado`);
      }

      const permission = await this.authorizationService.findPermissionById(permissionId);
      if (!permission && permissionId !== "*") {
        throw new NotFoundError(`Permissão com ID '${permissionId}' não encontrada`);
      }

      await this.authorizationService.grantRolePermission(roleId, permissionId);
      res.status(200).json({
        message: `Permissão '${permissionId}' concedida com sucesso ao cargo '${roleId}'`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/auth/roles/revoke
   * Revokes a permission from a role (requires roles.update permission)
   */
  public async revokeRolePermission(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { roleId, permissionId } = req.body;

      await this.authorizationService.revokeRolePermission(roleId, permissionId);
      res.status(200).json({
        message: `Permissão '${permissionId}' removida com sucesso do cargo '${roleId}'`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/users/:userId/permissions
   * Grants or denies a specific override permission to a user (requires users.update permission)
   */
  public async grantUserPermissionOverride(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const { permissionId, granted } = req.body;

      const user = await this.authService.findUserById(userId);
      if (!user) {
        throw new NotFoundError(`Usuário com ID '${userId}' não encontrado`);
      }

      const permission = await this.authorizationService.findPermissionById(permissionId);
      if (!permission && permissionId !== "*") {
        throw new NotFoundError(`Permissão com ID '${permissionId}' não encontrada`);
      }

      await this.authorizationService.grantUserPermissionOverride(userId, permissionId, granted);
      res.status(200).json({
        message: `Sobrescrita de permissão '${permissionId}' (${granted ? "concedida" : "negada"}) aplicada com sucesso ao usuário '${userId}'`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/auth/users/:userId/permissions/:permissionId
   * Removes a specific override permission from a user (requires users.update permission)
   */
  public async revokeUserPermissionOverride(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, permissionId } = req.params;

      await this.authorizationService.revokeUserPermissionOverride(userId, permissionId);
      res.status(200).json({
        message: `Sobrescrita de permissão '${permissionId}' removida com sucesso do usuário '${userId}'`,
      });
    } catch (error) {
      next(error);
    }
  }
}
