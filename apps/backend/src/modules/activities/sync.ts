import { and, asc, desc, eq, gte, ilike, or, sql } from "drizzle-orm";
import { db } from "../../db/client";
import { stravaActivities } from "../../db/schema";
import { getUserWithFreshToken } from "../strava/tokens";
import { listAthleteActivities, stravaId } from "../strava/client";

const perPage = 100;
const maxPages = 20;

export async function syncLast180Days(userId: string) {
  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - 180 * 24 * 60 * 60 * 1000);
  return syncActivitiesWindow(userId, { windowStart, windowEnd });
}

export async function syncActivitiesWindow(userId: string, input: { windowStart: Date; windowEnd: Date }) {
  if (Number.isNaN(input.windowStart.getTime()) || Number.isNaN(input.windowEnd.getTime())) {
    throw new Error("Invalid activity sync date range");
  }
  if (input.windowStart >= input.windowEnd) {
    throw new Error("Activity sync start date must be before end date");
  }

  const user = await getUserWithFreshToken(userId);
  const windowStart = input.windowStart;
  const windowEnd = input.windowEnd;
  const after = Math.floor(windowStart.getTime() / 1000);
  const before = Math.ceil(windowEnd.getTime() / 1000);
  let page = 1;
  let syncedCount = 0;

  while (page <= maxPages) {
    const activities = await listAthleteActivities(user.accessToken, { after, before, page, perPage });
    if (activities.length === 0) break;

    for (const activity of activities) {
      const stravaActivityId = stravaId(activity.id, activity.id_str);
      if (!stravaActivityId) continue;
      await db
        .insert(stravaActivities)
        .values({
          userId,
          stravaActivityId,
          externalId: activity.external_id ?? null,
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
            externalId: sql`coalesce(${stravaActivities.externalId}, ${activity.external_id ?? null})`,
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

export async function listSyncedActivities(
  userId: string,
  options: { limit?: number; offset?: number; search?: string | null; sportType?: string | null }
) {
  const limit = clampLimit(options.limit ?? 50);
  const offset = Math.max(0, options.offset ?? 0);
  const filters = [
    eq(stravaActivities.userId, userId),
    options.search
      ? or(
          ilike(stravaActivities.name, `%${options.search}%`),
          ilike(stravaActivities.sportType, `%${options.search}%`),
          ilike(stravaActivities.externalId, `%${options.search}%`)
        )
      : undefined,
    options.sportType ? eq(stravaActivities.sportType, options.sportType) : undefined
  ].filter(Boolean);
  const where = and(...filters);

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(stravaActivities)
    .where(where);

  const rows = await db
    .select()
    .from(stravaActivities)
    .where(where)
    .orderBy(desc(stravaActivities.startDate), asc(stravaActivities.name))
    .limit(limit)
    .offset(offset);
  const total = countRow?.count ?? 0;

  return {
    items: rows.map((activity) => ({
      id: activity.id,
      stravaActivityId: activity.stravaActivityId,
      externalId: activity.externalId,
      name: activity.name,
      sportType: activity.sportType,
      startDate: activity.startDate.toISOString(),
      timezone: activity.timezone,
      distanceMeters: activity.distanceMeters === null ? null : Number(activity.distanceMeters),
      movingTimeSeconds: activity.movingTimeSeconds,
      elapsedTimeSeconds: activity.elapsedTimeSeconds,
      syncedAt: activity.syncedAt.toISOString()
    })),
    total,
    limit,
    offset,
    nextOffset: offset + rows.length < total ? offset + rows.length : null
  };
}

export async function findActivityByExternalId(userId: string, externalId: string) {
  const [activity] = await db
    .select()
    .from(stravaActivities)
    .where(and(eq(stravaActivities.userId, userId), eq(stravaActivities.externalId, externalId)))
    .limit(1);
  return activity ?? null;
}

export async function listCandidateActivities(userId: string, startDate: Date, windowMs: number) {
  const start = new Date(startDate.getTime() - windowMs);
  const end = new Date(startDate.getTime() + windowMs);
  return db
    .select()
    .from(stravaActivities)
    .where(and(eq(stravaActivities.userId, userId), gte(stravaActivities.startDate, start), sql`${stravaActivities.startDate} <= ${end}`));
}

function clampLimit(limit: number) {
  if (!Number.isFinite(limit)) return 50;
  return Math.min(200, Math.max(1, Math.trunc(limit)));
}
