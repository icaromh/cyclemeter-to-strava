import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "./api";

describe("api client", () => {
  it("sends JSON requests with credentials", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ uploads: [] }));
    const api = createApiClient("http://api.test", fetcher);

    await api.uploadMissing(["00000000-0000-4000-8000-000000000001"]);

    expect(fetcher).toHaveBeenCalledWith(
      "http://api.test/uploads/missing",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
        body: JSON.stringify({ uploadedFileIds: ["00000000-0000-4000-8000-000000000001"] })
      })
    );
  });

  it("does not override multipart content headers", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ results: [] }));
    const api = createApiClient("http://api.test", fetcher);
    const file = new File(["activity"], "activity.fit");

    await api.checkFiles([file]);

    const requestInit = fetcher.mock.calls[0]?.[1] as RequestInit;
    expect(requestInit.credentials).toBe("include");
    expect(requestInit.headers).toBeUndefined();
    expect(requestInit.body).toBeInstanceOf(FormData);
  });

  it("builds activities list query params", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ items: [], total: 0, limit: 50, offset: 0, nextOffset: null }));
    const api = createApiClient("http://api.test", fetcher);

    await api.listActivities({ limit: 25, offset: 50, search: "ride", sportType: "VirtualRide" });

    expect(fetcher.mock.calls[0]?.[0]).toBe("http://api.test/activities?limit=25&offset=50&search=ride&sportType=VirtualRide");
  });

  it("syncs activities for a selected date range", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({
        syncedCount: 0,
        windowStart: "2026-04-01T00:00:00.000Z",
        windowEnd: "2026-04-14T23:59:59.999Z",
        lastSyncedAt: "2026-04-14T12:00:00.000Z"
      })
    );
    const api = createApiClient("http://api.test", fetcher);

    await api.syncActivitiesRange({ windowStart: "2026-04-01", windowEnd: "2026-04-14" });

    expect(fetcher).toHaveBeenCalledWith(
      "http://api.test/activities/sync",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ windowStart: "2026-04-01", windowEnd: "2026-04-14" })
      })
    );
  });

  it("throws backend error envelope messages", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({ error: { code: "not_authenticated", message: "Connect Strava first" } }, { status: 401 })
    );
    const api = createApiClient("http://api.test", fetcher);

    await expect(api.activitySummary()).rejects.toThrow("Connect Strava first");
  });
});

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init
  });
}
