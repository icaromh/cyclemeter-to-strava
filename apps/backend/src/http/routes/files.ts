import { Hono } from "hono";
import { checkUploadedFiles, listRecentChecks } from "../../modules/files/check";
import { HttpError } from "../errors";
import { requireSession } from "../middleware/session";

export const filesRoutes = new Hono();

filesRoutes.use("*", requireSession);

filesRoutes.post("/check", async (c) => {
  const body = await c.req.parseBody({ all: true });
  const rawFiles = body["files[]"] ?? body.files;
  const files = (Array.isArray(rawFiles) ? rawFiles : [rawFiles]).filter((item): item is File => item instanceof File);
  if (files.length === 0) throw new HttpError(400, "missing_files", "At least one file is required");
  return c.json({ results: await checkUploadedFiles(c.get("userId"), files) });
});

filesRoutes.get("/checks", async (c) => {
  const limit = Number(c.req.query("limit") ?? 50);
  return c.json(await listRecentChecks(c.get("userId"), c.req.query("status") ?? null, Number.isFinite(limit) ? limit : 50));
});

