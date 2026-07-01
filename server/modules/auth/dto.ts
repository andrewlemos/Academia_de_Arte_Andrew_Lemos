import { z } from "zod";

export const registerUserSchema = z.object({
  email: z.string().email("E-mail inválido"),
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  roleId: z.string().default("student"),
});

export const loginUserSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

export const updateUserRoleSchema = z.object({
  roleId: z.string().min(1, "RoleId é obrigatório"),
});

export const createRoleSchema = z.object({
  id: z.string().min(1, "ID é obrigatório"),
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
});

export const createPermissionSchema = z.object({
  id: z.string().min(1, "ID é obrigatório"),
  resource: z.string().min(1, "Recurso é obrigatório"),
  action: z.string().min(1, "Ação é obrigatória"),
  description: z.string().optional(),
});

export const grantRolePermissionSchema = z.object({
  roleId: z.string().min(1, "RoleId é obrigatório"),
  permissionId: z.string().min(1, "PermissionId é obrigatório"),
});

export const grantUserPermissionSchema = z.object({
  permissionId: z.string().min(1, "PermissionId é obrigatório"),
  granted: z.boolean().default(true),
});
