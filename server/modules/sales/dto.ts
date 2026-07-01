import { z } from "zod";

export const createSaleSchema = z.object({
  id: z.string().optional(),
  studentId: z.string().min(1, "ID do aluno é obrigatório"),
  studentName: z.string().min(2, "Nome do aluno é obrigatório"),
  studentEmail: z.string().email("E-mail do aluno inválido"),
  productId: z.string().min(1, "ID do produto é obrigatório"),
  productTitle: z.string().min(1, "Título do produto é obrigatório"),
  productType: z.enum(["course", "apostila"]),
  pricePaid: z.number().min(0),
  couponUsed: z.string().optional(),
  paymentMethod: z.enum(["credit_card", "pix", "boleto"]),
  paymentStatus: z.enum(["approved", "pending", "failed"]).default("pending"),
  createdAt: z.string().optional(),
});

export const createCouponSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(2, "Código do cupom é obrigatório"),
  discountPercent: z.number().min(1).max(100),
  expiresAt: z.string().min(1, "Data de expiração é obrigatória"),
  active: z.boolean().default(true),
});

export const updateCouponSchema = createCouponSchema.partial();
