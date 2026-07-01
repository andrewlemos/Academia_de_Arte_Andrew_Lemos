import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  FIRESTORE_DATABASE: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Erro de validação das variáveis de ambiente:", parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;

export const isProduction =
  env.NODE_ENV === "production" ||
  process.env.NODE_ENV === "production";
