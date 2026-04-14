import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "../../db/client";
import { stravaActivities } from "../../db/schema";
import { getUserWithFreshToken } from "../strava/tokens";
import { listAthleteActivities, stravaId } from "../strava/client";

const perPage = 100;
const maxPages = 20;

export async function syncLast180Days(userId: string) {
  const user = await getUserWithFreshToken(userId);
  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - 180 * 24 * 60 * 60 * 1000);
  const after = Math.floor(windowStart.getTime() / 1000);
  let page = 1;
  let syncedCount = 0;

  while (page <= maxPages) {
    const activities = await listAthleteActivities(user.accessToken, { after, page, perPage });
    if (activities.length === 0) break;

    for (const activity of activities) {
      const stravaActivityId = stravaId(activity.id, activity.id_str);
      if (!stravaActivityId) continue;
      await db
        .insert(stravaActivities)
        .values({
          userId,
          stravaActivityId,
          name: activity.name,
          sportType: activity.sport_type ?? activity.type ?? null,
          startDate: new Date(activity.start_date),
          timezone: activity.timezone ?? null,
          distanceMeters: activity.distance === undefined ? null : String(activity.distance),
          movingTimeSeconds: activity.moving_time ?? null,
          elapsedTimeSeconds: activity.elapsed_time ?? null,
          rawJson: activity,
          syncedAt: new Date()
        })
        .onConflictDoUpdate({
          target: [stravaActivities.userId, stravaActivities.stravaActivityId],
          set: {
            name: activity.name,
            sportType: activity.sport_type ?? activity.type ?? null,
            startDate: new Date(activity.start_date),
            timezone: activity.timezone ?? null,
            distanceMeters: activity.distance === undefined ? null : String(activity.distance),
            movingTimeSeconds: activity.moving_time ?? null,
            elapsedTimeSeconds: activity.elapsed_time ?? null,
            rawJson: activity,
            syncedAt: new Date()
          }
        });
      syncedCount += 1;
    }

    if (activities.length < perPage) break;
    page += 1;
  }

  return {
    syncedCount,
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    lastSyncedAt: new Date().toISOString()
  };
}

export async function getActivitySummary(userId: string) {
  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(stravaActivities)
    .where(eq(stravaActivities.userId, userId));
  const [latest] = await db
    .select({ syncedAt: stravaActivities.syncedAt })
    .from(stravaActivities)
    .where(eq(stravaActivities.userId, userId))
    .orderBy(desc(stravaActivities.syncedAt))
    .limit(1);

  return {
    activityCount: countRow?.count ?? 0,
    lastSyncedAt: latest?.syncedAt?.toISOString() ?? null
  };
}

export async function listCandidateActivities(userId: string, startDate: Date, windowMs: number) {
  const start = new Date(startDate.getTime() - windowMs);
  const end = new Date(startDate.getTime() + windowMs);
  return db
    .select()
    .from(stravaActivities)
    .where(and(eq(stravaActivities.userId, userId), gte(stravaActivities.startDate, start), sql`${stravaActivities.startDate} <= ${end}`));
}
