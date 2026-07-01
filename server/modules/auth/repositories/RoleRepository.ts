import { firestoreDb } from "../../../config/firebase";
import { Role, RolePermission } from "../types";

export class RoleRepository {
  private rolesCollection = firestoreDb.collection("roles");
  private rolePermissionsCollection = firestoreDb.collection("role_permissions");

  private static mockRoles = new Map<string, Role>();
  private static mockRolePermissions = new Map<string, RolePermission>();

  public async findById(id: string): Promise<Role | null> {
    if (process.env.NODE_ENV === "test") {
      const role = RoleRepository.mockRoles.get(id);
      return role ? { ...role } : null;
    }
    const doc = await this.rolesCollection.doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return { id: doc.id, ...doc.data() } as Role;
  }

  public async create(role: Role): Promise<Role> {
    if (process.env.NODE_ENV === "test") {
      RoleRepository.mockRoles.set(role.id, { ...role });
      return role;
    }
    await this.rolesCollection.doc(role.id).set({
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    });
    return role;
  }

  public async listAll(): Promise<Role[]> {
    if (process.env.NODE_ENV === "test") {
      return Array.from(RoleRepository.mockRoles.values()).map(r => ({ ...r }));
    }
    const snapshot = await this.rolesCollection.get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Role));
  }

  public async getPermissionsByRoleId(roleId: string): Promise<string[]> {
    if (process.env.NODE_ENV === "test") {
      const perms: string[] = [];
      for (const rp of RoleRepository.mockRolePermissions.values()) {
        if (rp.roleId === roleId) {
          perms.push(rp.permissionId);
        }
      }
      return perms;
    }
    const query = await this.rolePermissionsCollection.where("roleId", "==", roleId).get();
    return query.docs.map((doc) => doc.data().permissionId as string);
  }

  public async addPermissionToRole(roleId: string, permissionId: string): Promise<void> {
    const id = `${roleId}_${permissionId}`;
    if (process.env.NODE_ENV === "test") {
      RoleRepository.mockRolePermissions.set(id, { id, roleId, permissionId });
      return;
    }
    await this.rolePermissionsCollection.doc(id).set({
      roleId,
      permissionId,
    });
  }

  public async removePermissionFromRole(roleId: string, permissionId: string): Promise<void> {
    const id = `${roleId}_${permissionId}`;
    if (process.env.NODE_ENV === "test") {
      RoleRepository.mockRolePermissions.delete(id);
      return;
    }
    await this.rolePermissionsCollection.doc(id).delete();
  }
}
