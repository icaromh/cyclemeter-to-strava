import { describe, expect, it } from "vitest";
import { formatDistance, formatDuration, formatPageRange, stravaActivityUrl } from "./ActivitiesRoute";

describe("ActivitiesRoute formatters", () => {
  it("formats activity distance", () => {
    expect(formatDistance(null)).toBe("-");
    expect(formatDistance(750)).toBe("750 m");
    expect(formatDistance(10542)).toBe("10.54 km");
  });

  it("formats activity duration", () => {
    expect(formatDuration(null)).toBe("-");
    expect(formatDuration(42)).toBe("42s");
    expect(formatDuration(742)).toBe("12m 22s");
    expect(formatDuration(3900)).toBe("1h 5m");
  });

  it("formats empty and non-empty page ranges", () => {
    expect(formatPageRange(0, 0)).toBe("0");
    expect(formatPageRange(0, 50)).toBe("1-50");
    expect(formatPageRange(200, 19)).toBe("201-219");
  });

  it("builds a direct Strava activity URL", () => {
    expect(stravaActivityUrl("18106372909")).toBe("https://www.strava.com/activities/18106372909");
  });
});
