import { z } from "zod";

const envSchema = z.object({
  VITE_API_URL: z.string().url().default("http://localhost:8080"),
  VITE_APP_NAME: z.string().default("Sufrix"),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables — see console.");
}

export const env = parsed.data;
