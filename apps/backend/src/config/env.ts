import { z } from "zod";

export const envSchema = z.object({
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

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: NodeJS.ProcessEnv): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${details}`);
  }
  return result.data;
}

export const env = parseEnv(process.env);
