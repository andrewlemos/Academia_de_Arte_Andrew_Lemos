import { z } from "zod";

export const issueCertificateSchema = z.object({
  studentId: z.string().min(1, "ID do estudante é obrigatório"),
  studentName: z.string().min(1, "Nome do estudante é obrigatório"),
  courseId: z.string().min(1, "ID do curso é obrigatório"),
  courseTitle: z.string().min(1, "Título do curso é obrigatório"),
});
