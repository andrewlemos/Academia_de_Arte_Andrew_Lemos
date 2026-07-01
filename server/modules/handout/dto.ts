import { z } from "zod";

export const handoutChapterSchema = z.object({
  id: z.string().min(1, "ID do capítulo é obrigatório"),
  title: z.string().min(1, "Título do capítulo é obrigatório"),
  content: z.string().min(1, "Conteúdo do capítulo é obrigatório"),
});

export const createHandoutSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(2, "Título deve ter pelo menos 2 caracteres"),
  description: z.string().min(5, "Descrição deve ter pelo menos 5 caracteres"),
  longDescription: z.string().optional(),
  coverUrl: z.string().url("URL da capa inválida"),
  price: z.number().min(0, "Preço inválido"),
  chapters: z.array(handoutChapterSchema).default([]),
  status: z.enum(["ativo", "breve", "desativado"]).default("ativo"),
});

export const updateHandoutSchema = createHandoutSchema.partial();
