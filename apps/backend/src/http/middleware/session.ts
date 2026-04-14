import { createHmac, timingSafeEqual } from "node:crypto";
import type { Context, Next } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { env } from "../../config/env";
import { HttpError } from "../errors";

const cookieName = "strava_sync_session";
const sessionMaxAgeSeconds = 60 * 60 * 24 * 30;

function sign(value: string) {
  return createHmac("sha256", env.SESSION_SECRET).update(value).digest("base64url");
}

function encode(payload: { userId: string; expiresAt: number }) {
  const value = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${value}.${sign(value)}`;
}

function decode(cookie: string | undefined) {
  if (!cookie) return null;
  const [value, signature] = cookie.split(".");
  if (!value || !signature) return null;
  const expected = sign(value);
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== actualBuffer.length || !timingSafeEqual(expectedBuffer, actualBuffer)) return null;
  const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as {
    userId?: string;
    expiresAt?: number;
  };
  if (typeof parsed.userId !== "string" || typeof parsed.expiresAt !== "number") return null;
  if (parsed.expiresAt <= Date.now()) return null;
  return { userId: parsed.userId };
}

export function setSession(c: Context, userId: string) {
  setCookie(c, cookieName, encode({ userId, expiresAt: Date.now() + sessionMaxAgeSeconds * 1000 }), {
    httpOnly: true,
    sameSite: "Lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionMaxAgeSeconds
  });
}

export function getSession(c: Context) {
  try {
    return decode(getCookie(c, cookieName));
  } catch {
    return null;
  }
}

export async function requireSession(c: Context, next: Next) {
  const session = getSession(c);
  if (!session) throw new HttpError(401, "unauthorized", "Authentication is required");
  c.set("userId", session.userId);
  await next();
}

declare module "hono" {
  interface ContextVariableMap {
    userId: string;
  }
}
