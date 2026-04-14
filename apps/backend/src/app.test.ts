import { describe, expect, it } from "vitest";
import { app } from "./app";

describe("app", () => {
  it("serves healthcheck", async () => {
    const response = await app.request("/health");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "ok",
      service: "strava-sync-backend",
      environment: "test"
    });
  });

  it("uses the standardized not found envelope", async () => {
    const response = await app.request("/missing");
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: {
        code: "not_found",
        message: "Route not found"
      }
    });
  });

  it("allows credentialed requests from the configured frontend origin", async () => {
    const response = await app.request("/health", {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:5173",
        "Access-Control-Request-Method": "GET"
      }
    });
    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
    expect(response.headers.get("access-control-allow-credentials")).toBe("true");
  });
});
