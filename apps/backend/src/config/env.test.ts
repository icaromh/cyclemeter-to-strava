import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

const validEnv = {
  PORT: "3000",
  DATABASE_URL: "postgres://strava_sync:strava_sync@localhost:5432/strava_sync",
  STRAVA_REDIRECT_URI: "http://localhost:3000/auth/strava/callback",
  SESSION_SECRET: "test-secret-with-enough-length-for-hmac",
  FRONTEND_URL: "http://localhost:5173"
};

describe("parseEnv", () => {
  it("coerces defaults for local development", () => {
    const env = parseEnv(validEnv);
    expect(env.PORT).toBe(3000);
    expect(env.NODE_ENV).toBe("development");
    expect(env.UPLOAD_DIR).toBe(".data/uploads");
  });

  it("throws a readable error for invalid configuration", () => {
    expect(() =>
      parseEnv({
        ...validEnv,
        DATABASE_URL: "not-a-url",
        SESSION_SECRET: "short"
      })
    ).toThrow(/Invalid environment configuration: .*DATABASE_URL.*SESSION_SECRET/);
  });
});
