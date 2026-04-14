import type { MiddlewareHandler } from "hono";
import { cors } from "hono/cors";
import { env } from "../../config/env";

export const corsMiddleware: MiddlewareHandler = cors({
  origin: env.FRONTEND_URL,
  credentials: true,
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "OPTIONS"]
});
