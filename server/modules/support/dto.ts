import { z } from "zod";

export const createSupportTicketSchema = z.object({
  id: z.string().optional(),
  studentId: z.string().min(1, "ID do estudante é obrigatório"),
  studentName: z.string().min(1, "Nome do estudante é obrigatório"),
  studentEmail: z.string().email("E-mail inválido"),
  courseId: z.string().min(1, "ID do curso é obrigatório"),
  lessonId: z.string().min(1, "ID da aula é obrigatório"),
  lessonTitle: z.string().min(1, "Título da aula é obrigatório"),
  queryText: z.string().min(3, "O texto do suporte deve conter pelo menos 3 caracteres"),
  imageUrl: z.string().optional(),
  type: z.enum(["question", "practical_work"]).default("question"),
});

export const answerTicketSchema = z.object({
  answerText: z.string().min(2, "Resposta deve ter pelo menos 2 caracteres"),
});
