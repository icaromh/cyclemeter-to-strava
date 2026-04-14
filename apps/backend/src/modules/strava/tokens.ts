import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { users } from "../../db/schema";
import { HttpError } from "../../http/errors";
import { refreshAccessToken } from "./client";

export async function getUserWithFreshToken(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new HttpError(401, "user_not_found", "Authenticated user was not found");

  if (user.tokenExpiresAt.getTime() > Date.now() + 60_000) return user;

  const refreshed = await refreshAccessToken(user.refreshToken);
  const [updated] = await db
    .update(users)
    .set({
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token,
      tokenExpiresAt: new Date(refreshed.expires_at * 1000),
      updatedAt: new Date()
    })
    .where(eq(users.id, user.id))
    .returning();

  if (!updated) throw new HttpError(401, "token_refresh_failed", "Could not refresh Strava token");
  return updated;
}

