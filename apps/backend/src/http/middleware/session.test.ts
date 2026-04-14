import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { describe, expect, it } from "vitest";
import { toErrorResponse } from "../errors";
import { getSession, requireSession, setSession } from "./session";

describe("session middleware", () => {
  it("sets and reads a signed session cookie", async () => {
    const app = new Hono();
    app.get("/login", (c) => {
      setSession(c, "user-123");
      return c.text("ok");
    });
    app.get("/me", (c) => c.json(getSession(c)));

    const loginResponse = await app.request("/login");
    const cookie = loginResponse.headers.get("set-cookie");
    expect(cookie).toContain("strava_sync_session=");
    expect(cookie).toContain("HttpOnly");

    const meResponse = await app.request("/me", {
      headers: {
        Cookie: cookie ?? ""
      }
    });
    expect(await meResponse.json()).toEqual({ userId: "user-123" });
  });

  it("rejects missing sessions", async () => {
    const app = new Hono();
    app.use("/private", requireSession);
    app.get("/private", (c) => c.text(c.get("userId")));
    app.onError((error, c) => {
      const response = toErrorResponse(error);
      return c.json(response.body, response.status as ContentfulStatusCode);
    });

    const response = await app.request("/private");
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: {
        code: "unauthorized",
        message: "Authentication is required"
      }
    });
  });

  it("rejects tampered cookies", async () => {
    const app = new Hono();
    app.get("/me", (c) => c.json(getSession(c)));

    const response = await app.request("/me", {
      headers: {
        Cookie: "strava_sync_session=payload.signature"
      }
    });
    expect(await response.json()).toBeNull();
  });
});
