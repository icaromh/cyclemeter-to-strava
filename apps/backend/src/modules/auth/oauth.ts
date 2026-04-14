import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client";
import { users } from "../../db/schema";
import { env } from "../../config/env";
import { HttpError } from "../../http/errors";
import { exchangeCodeForToken, stravaId } from "../strava/client";

const requiredScopes = ["activity:read_all", "activity:write"];

export function makeOauthState(returnTo: string | null) {
  const safeReturnTo = returnTo?.startsWith("/") ? returnTo : "/";
  const payload = {
    nonce: randomBytes(16).toString("base64url"),
    returnTo: safeReturnTo
  };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function parseOauthState(state: string | null) {
  if (!state) return { returnTo: "/" };
  try {
    const parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as { returnTo?: string };
    return { returnTo: parsed.returnTo?.startsWith("/") ? parsed.returnTo : "/" };
  } catch {
    return { returnTo: "/" };
  }
}

export function validateScopes(scope: string | null) {
  const accepted = new Set((scope ?? "").split(",").map((item) => item.trim()).filter(Boolean));
  const missing = requiredScopes.filter((required) => !accepted.has(required));
  if (missing.length > 0) {
    throw new HttpError(403, "missing_strava_scopes", "Required Strava scopes were not accepted", { missing });
  }
  return [...accepted].join(",");
}

export async function completeOAuth(input: { code: string; scope: string | null }) {
  const acceptedScopes = validateScopes(input.scope);
  const token = await exchangeCodeForToken(input.code);
  const athleteId = stravaId(token.athlete.id, token.athlete.id_str);
  if (!athleteId) throw new HttpError(400, "missing_athlete_id", "Strava did not return an athlete id");

  const username =
    token.athlete.username ??
    [token.athlete.firstname, token.athlete.lastname].filter(Boolean).join(" ") ??
    null;

  const [existing] = await db.select().from(users).where(eq(users.stravaAthleteId, athleteId)).limit(1);
  if (existing) {
    const [updated] = await db
      .update(users)
      .set({
        username,
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        tokenExpiresAt: new Date(token.expires_at * 1000),
        acceptedScopes,
        updatedAt: new Date()
      })
      .where(and(eq(users.id, existing.id), eq(users.stravaAthleteId, athleteId)))
      .returning();
    if (!updated) throw new HttpError(500, "user_update_failed", "Could not update authenticated user");
    return updated;
  }

  const [created] = await db
    .insert(users)
    .values({
      stravaAthleteId: athleteId,
      username,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      tokenExpiresAt: new Date(token.expires_at * 1000),
      acceptedScopes
    })
    .returning();
  if (!created) throw new HttpError(500, "user_create_failed", "Could not create authenticated user");
  return created;
}

export function frontendRedirectUrl(returnTo: string) {
  return new URL(returnTo, env.FRONTEND_URL).toString();
}

