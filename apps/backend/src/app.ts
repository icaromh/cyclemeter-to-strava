import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { corsMiddleware } from "./http/middleware/cors";
import { loggerMiddleware } from "./http/middleware/logger";
import { toErrorResponse } from "./http/errors";
import { authRoutes } from "./http/routes/auth";
import { activitiesRoutes } from "./http/routes/activities";
import { filesRoutes } from "./http/routes/files";
import { uploadsRoutes } from "./http/routes/uploads";

export const app = new Hono();

app.use("*", corsMiddleware);
app.use("*", loggerMiddleware);

app.get("/health", (c) =>
  c.json({
    status: "ok",
    service: "strava-sync-backend",
    environment: process.env.NODE_ENV ?? "development"
  })
);

app.route("/auth", authRoutes);
app.route("/activities", activitiesRoutes);
app.route("/files", filesRoutes);
app.route("/uploads", uploadsRoutes);

app.onError((error, c) => {
  const response = toErrorResponse(error);
  return c.json(response.body, response.status as ContentfulStatusCode);
});

app.notFound((c) =>
  c.json(
    {
      error: {
        code: "not_found",
        message: "Route not found"
      }
    },
    404
  )
);
