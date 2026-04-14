import { Hono } from "hono";
import { uploadMissingRequestSchema } from "@strava-sync/shared";
import { getUploadStatus, submitMissingUploads } from "../../modules/uploads/uploads";
import { requireSession } from "../middleware/session";

export const uploadsRoutes = new Hono();

uploadsRoutes.use("*", requireSession);

uploadsRoutes.post("/missing", async (c) => {
  const input = uploadMissingRequestSchema.parse(await c.req.json());
  const result = await submitMissingUploads(c.get("userId"), input.uploadedFileIds);
  return c.json(result, 202);
});

uploadsRoutes.get("/status/:id", async (c) => {
  return c.json(await getUploadStatus(c.get("userId"), c.req.param("id")));
});

