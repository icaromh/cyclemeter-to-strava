import { describe, expect, it } from "vitest";
import { HttpError } from "../../http/errors";
import { frontendRedirectUrl, makeOauthState, parseOauthState, validateScopes } from "./oauth";

describe("oauth helpers", () => {
  it("validates Strava read_all and write scopes", () => {
    expect(validateScopes("read,activity:read_all,activity:write")).toBe("read,activity:read_all,activity:write");
    expect(validateScopes("read activity:read_all activity:write")).toBe("read,activity:read_all,activity:write");
  });

  it("reports missing required scopes", () => {
    expect(() => validateScopes("activity:read_all")).toThrow(HttpError);
    expect(() => validateScopes("activity:read_all")).toThrow("Required Strava scopes were not accepted");
  });

  it("encodes and sanitizes return paths in state", () => {
    expect(parseOauthState(makeOauthState("/upload/check"))).toEqual({ returnTo: "/upload/check" });
    expect(parseOauthState(makeOauthState("https://evil.example"))).toEqual({ returnTo: "/" });
    expect(parseOauthState("not-json")).toEqual({ returnTo: "/" });
  });

  it("builds frontend redirects from relative paths only", () => {
    expect(frontendRedirectUrl("/upload/check")).toBe("http://localhost:5173/upload/check");
  });
});
