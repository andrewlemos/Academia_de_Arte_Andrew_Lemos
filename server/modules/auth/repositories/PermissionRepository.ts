import { firestoreDb } from "../../../config/firebase";
import { Permission, UserPermission } from "../types";

export class PermissionRepository {
  private permissionsCollection = firestoreDb.collection("permissions");
  private userPermissionsCollection = firestoreDb.collection("user_permissions");

  private static mockPermissions = new Map<string, Permission>();
  private static mockUserPermissions = new Map<string, UserPermission>();

  public async findById(id: string): Promise<Permission | null> {
    if (process.env.NODE_ENV === "test") {
      const perm = PermissionRepository.mockPermissions.get(id);
      return perm ? { ...perm } : null;
    }
    const doc = await this.permissionsCollection.doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return { id: doc.id, ...doc.data() } as Permission;
  }

  public async create(permission: Permission): Promise<Permission> {
    if (process.env.NODE_ENV === "test") {
      PermissionRepository.mockPermissions.set(permission.id, { ...permission });
      return permission;
    }
    await this.permissionsCollection.doc(permission.id).set({
      resource: permission.resource,
      action: permission.action,
      description: permission.description,
    });
    return permission;
  }

  public async listAll(): Promise<Permission[]> {
    if (process.env.NODE_ENV === "test") {
      return Array.from(PermissionRepository.mockPermissions.values()).map(p => ({ ...p }));
    }
    const snapshot = await this.permissionsCollection.get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Permission));
  }

  public async getPermissionsByUserId(userId: string): Promise<UserPermission[]> {
    if (process.env.NODE_ENV === "test") {
      const upList: UserPermission[] = [];
      for (const up of PermissionRepository.mockUserPermissions.values()) {
        if (up.userId === userId) {
          upList.push({ ...up });
        }
      }
      return upList;
    }
    const query = await this.userPermissionsCollection.where("userId", "==", userId).get();
    return query.docs.map((doc) => ({ id: doc.id, ...doc.data() } as UserPermission));
  }

  public async addPermissionToUser(userId: string, permissionId: string, granted: boolean): Promise<void> {
    const id = `${userId}_${permissionId}`;
    if (process.env.NODE_ENV === "test") {
      PermissionRepository.mockUserPermissions.set(id, { id, userId, permissionId, granted });
      return;
    }
    await this.userPermissionsCollection.doc(id).set({
      userId,
      permissionId,
      granted,
    });
  }

  public async removePermissionFromUser(userId: string, permissionId: string): Promise<void> {
    const id = `${userId}_${permissionId}`;
    if (process.env.NODE_ENV === "test") {
      PermissionRepository.mockUserPermissions.delete(id);
      return;
    }
    await this.userPermissionsCollection.doc(id).delete();
  }
}
