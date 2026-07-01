import { RoleRepository } from "../repositories/RoleRepository";
import { PermissionRepository } from "../repositories/PermissionRepository";
import { UserRepository } from "../repositories/UserRepository";
import { Logger } from "../../../utils/logger";

export class AuthorizationService {
  private roleRepository = new RoleRepository();
  private permissionRepository = new PermissionRepository();
  private userRepository = new UserRepository();

  /**
   * Resolves the full list of permissions for a user based on their Role and individual User Overrides.
   */
  public async resolveUserPermissions(userId: string): Promise<string[]> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      Logger.warn(`Incapaz de resolver permissões para usuário inexistente: ${userId}`);
      return [];
    }

    if (user.status === "inactive") {
      Logger.warn(`Usuário inativo tentou carregar permissões: ${userId}`);
      return [];
    }

    // 1. Get permissions granted to the User's Role
    const rolePermissions = await this.roleRepository.getPermissionsByRoleId(user.roleId);
    const resolvedPermissionsSet = new Set<string>(rolePermissions);

    // 2. Load individual user-specific permission overrides (granted: true or false)
    const userOverrides = await this.permissionRepository.getPermissionsByUserId(userId);

    for (const override of userOverrides) {
      if (override.granted) {
        resolvedPermissionsSet.add(override.permissionId);
      } else {
        resolvedPermissionsSet.delete(override.permissionId);
      }
    }

    return Array.from(resolvedPermissionsSet);
  }

  /**
   * Helper function to match standard permissions or wildcard patterns.
   * e.g., "courses.*" will match "courses.create" and "courses.read"
   * e.g., "*" will match any permission
   */
  public static matchPermission(userPermissions: string[], requiredPermission: string): boolean {
    if (userPermissions.includes("*")) {
      return true;
    }

    if (userPermissions.includes(requiredPermission)) {
      return true;
    }

    // Check for wildcard overrides such as "courses.*"
    for (const perm of userPermissions) {
      if (perm.endsWith(".*")) {
        const prefix = perm.slice(0, -2); // get "courses"
        if (requiredPermission.startsWith(prefix + ".")) {
          return true;
        }
      }
    }

    return false;
  }

  // --- Role Management ---

  public async findRoleById(id: string) {
    return await this.roleRepository.findById(id);
  }

  public async createRole(role: any) {
    return await this.roleRepository.create(role);
  }

  public async listAllRoles() {
    return await this.roleRepository.listAll();
  }

  // --- Permission Management ---

  public async findPermissionById(id: string) {
    return await this.permissionRepository.findById(id);
  }

  public async createPermission(permission: any) {
    return await this.permissionRepository.create(permission);
  }

  public async listAllPermissions() {
    return await this.permissionRepository.listAll();
  }

  // --- Role Permissions ---

  public async grantRolePermission(roleId: string, permissionId: string) {
    return await this.roleRepository.addPermissionToRole(roleId, permissionId);
  }

  public async revokeRolePermission(roleId: string, permissionId: string) {
    return await this.roleRepository.removePermissionFromRole(roleId, permissionId);
  }

  // --- User Permission Overrides ---

  public async grantUserPermissionOverride(userId: string, permissionId: string, granted: boolean) {
    return await this.permissionRepository.addPermissionToUser(userId, permissionId, granted);
  }

  public async revokeUserPermissionOverride(userId: string, permissionId: string) {
    return await this.permissionRepository.removePermissionFromUser(userId, permissionId);
  }
}
