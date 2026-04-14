import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),
  STRAVA_CLIENT_ID: z.string().default(""),
  STRAVA_CLIENT_SECRET: z.string().default(""),
  STRAVA_REDIRECT_URI: z.string().url(),
  SESSION_SECRET: z.string().min(24),
  FRONTEND_URL: z.string().url(),
  UPLOAD_DIR: z.string().default(".data/uploads"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development")
});

export const env = envSchema.parse(process.env);

