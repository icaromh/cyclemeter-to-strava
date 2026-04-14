import { Hono } from "hono";
import { getActivitySummary, syncLast180Days } from "../../modules/activities/sync";
import { requireSession } from "../middleware/session";

export const activitiesRoutes = new Hono();

activitiesRoutes.use("*", requireSession);

activitiesRoutes.post("/sync-180d", async (c) => {
  return c.json(await syncLast180Days(c.get("userId")));
});

activitiesRoutes.get("/summary", async (c) => {
  return c.json(await getActivitySummary(c.get("userId")));
});

