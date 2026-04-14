import { Hono } from "hono";
import { activitySyncRequestSchema } from "@strava-sync/shared";
import { getActivitySummary, listSyncedActivities, syncActivitiesWindow, syncLast180Days } from "../../modules/activities/sync";
import { HttpError } from "../errors";
import { requireSession } from "../middleware/session";

export const activitiesRoutes = new Hono();

activitiesRoutes.use("*", requireSession);

activitiesRoutes.post("/sync-180d", async (c) => {
  return c.json(await syncLast180Days(c.get("userId")));
});

activitiesRoutes.post("/sync", async (c) => {
  const input = activitySyncRequestSchema.parse(await c.req.json());
  const windowStart = parseDateInput(input.windowStart, false);
  const windowEnd = parseDateInput(input.windowEnd, true);
  if (windowStart >= windowEnd) {
    throw new HttpError(400, "invalid_date_range", "Activity sync start date must be before end date");
  }
  return c.json(await syncActivitiesWindow(c.get("userId"), { windowStart, windowEnd }));
});

activitiesRoutes.get("/summary", async (c) => {
  return c.json(await getActivitySummary(c.get("userId")));
});

activitiesRoutes.get("/", async (c) => {
  return c.json(
    await listSyncedActivities(c.get("userId"), {
      limit: Number(c.req.query("limit") ?? 50),
      offset: Number(c.req.query("offset") ?? 0),
      search: c.req.query("search") ?? null,
      sportType: c.req.query("sportType") ?? null
    })
  );
});

function parseDateInput(value: string, endOfDay: boolean) {
  const dateOnlyMatch = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(dateOnlyMatch ? `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z` : value);
  if (Number.isNaN(date.getTime())) {
    throw new HttpError(400, "invalid_date_range", "Invalid activity sync date range");
  }
  return date;
}
