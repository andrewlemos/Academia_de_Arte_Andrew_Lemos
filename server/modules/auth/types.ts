export interface Role {
  id: string; // e.g., "student", "admin", "support", "instructor", "super_admin"
  name: string;
  description: string;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  id: string; // e.g., "courses.read", "courses.create"
  resource: string;
  action: string;
  description: string;
}

export interface RolePermission {
  id: string; // `${roleId}_${permissionId}`
  roleId: string;
  permissionId: string;
}

export interface UserPermission {
  id: string; // `${userId}_${permissionId}`
  userId: string;
  permissionId: string;
  granted: boolean;
}

export interface User {
  id: string; // Firebase Auth UID
  name: string;
  email: string;
  roleId: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface RequestWithUser extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    roleId: string;
    permissions: string[];
  };
}
