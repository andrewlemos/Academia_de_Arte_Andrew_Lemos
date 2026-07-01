import { z } from "zod";

export const materialSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  url: z.string().url(),
  size: z.string(),
});

export const quizQuestionSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  options: z.array(z.string()).min(2),
  correctAnswerIndex: z.number().int().nonnegative(),
});

export const createCourseSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(2, "Título deve ter pelo menos 2 caracteres"),
  description: z.string().min(5, "Descrição deve ter pelo menos 5 caracteres"),
  longDescription: z.string().optional(),
  coverUrl: z.string().url("URL da imagem de capa inválida"),
  category: z.string().min(1, "Categoria é obrigatória"),
  price: z.number().nonnegative("Preço não pode ser negativo"),
  freeModules: z.array(z.string()).default([]),
  duration: z.string().optional(),
  status: z.enum(["ativo", "breve", "desativado"]).default("ativo"),
});

export const updateCourseSchema = createCourseSchema.partial();

export const createModuleSchema = z.object({
  id: z.string().optional(),
  courseId: z.string().min(1, "ID do curso é obrigatório"),
  title: z.string().min(2, "Título deve ter pelo menos 2 caracteres"),
  description: z.string().min(5, "Descrição deve ter pelo menos 5 caracteres"),
  coverUrl: z.string().url().optional(),
  order: z.number().int().default(0),
});

export const updateModuleSchema = createModuleSchema.partial();

export const createLessonSchema = z.object({
  id: z.string().optional(),
  moduleId: z.string().min(1, "ID do módulo é obrigatório"),
  courseId: z.string().min(1, "ID do curso é obrigatório"),
  title: z.string().min(2, "Título deve ter pelo menos 2 caracteres"),
  description: z.string().min(5, "Descrição deve ter pelo menos 5 caracteres"),
  videoUrl: z.string().optional(),
  textContent: z.string().optional(),
  materials: z.array(materialSchema).optional(),
  downloadFiles: z.array(materialSchema).optional(),
  order: z.number().int().default(0),
  duration: z.string().optional(),
  quiz: z.array(quizQuestionSchema).optional(),
});

export const updateLessonSchema = createLessonSchema.partial();

export const saveProgressSchema = z.object({
  studentId: z.string().min(1, "ID do estudante é obrigatório"),
  lessonId: z.string().min(1, "ID da aula é obrigatório"),
  courseId: z.string().min(1, "ID do curso é obrigatório"),
  completed: z.boolean().optional(),
  completedAt: z.string().optional(),
  favorited: z.boolean().optional(),
});

export const createCommentSchema = z.object({
  lessonId: z.string().min(1, "ID da aula é obrigatório"),
  courseId: z.string().min(1, "ID do curso é obrigatório"),
  userName: z.string().min(1, "Nome do usuário é obrigatório"),
  userEmail: z.string().email("E-mail de usuário inválido"),
  userRole: z.enum(["admin", "student"]),
  comment: z.string().min(1, "Comentário não pode ser vazio"),
  avatarUrl: z.string().url().optional(),
  parentCommentId: z.string().optional(),
});

