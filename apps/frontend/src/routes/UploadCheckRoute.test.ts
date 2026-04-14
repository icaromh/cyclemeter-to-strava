import { describe, expect, it } from "vitest";
import type { FileCheckResult } from "@strava-sync/shared";
import {
  filterFileChecks,
  getUploadableFileIds,
  getUploadProgressValue,
  isUploadTerminal
} from "../lib/uploadCheck";

describe("UploadCheckRoute rules", () => {
  it("allows upload only for files not found in Strava", () => {
    expect(getUploadableFileIds(checkResults)).toEqual(["00000000-0000-4000-8000-000000000001"]);
  });

  it("filters file check results by match status", () => {
    expect(filterFileChecks(checkResults, "all")).toHaveLength(4);
    expect(filterFileChecks(checkResults, "not_found").map((result) => result.originalFilename)).toEqual(["missing.fit"]);
    expect(filterFileChecks(checkResults, "match_confirmed").map((result) => result.originalFilename)).toEqual([
      "confirmed.fit"
    ]);
  });

  it("stops polling once the Strava upload reaches a terminal status", () => {
    expect(isUploadTerminal("pending")).toBe(false);
    expect(isUploadTerminal("submitted")).toBe(false);
    expect(isUploadTerminal("processing")).toBe(false);
    expect(isUploadTerminal("uploaded")).toBe(true);
    expect(isUploadTerminal("duplicate")).toBe(true);
    expect(isUploadTerminal("failed")).toBe(true);
  });

  it("keeps terminal upload statuses visually complete", () => {
    expect(getUploadProgressValue("pending")).toBeLessThan(getUploadProgressValue("processing"));
    expect(getUploadProgressValue("uploaded")).toBe(100);
    expect(getUploadProgressValue("duplicate")).toBe(100);
    expect(getUploadProgressValue("failed")).toBe(100);
  });
});

const checkResults: FileCheckResult[] = [
  makeCheckResult("00000000-0000-4000-8000-000000000001", "missing.fit", "not_found"),
  makeCheckResult("00000000-0000-4000-8000-000000000002", "confirmed.fit", "match_confirmed"),
  makeCheckResult("00000000-0000-4000-8000-000000000003", "probable.fit", "match_probable"),
  makeCheckResult("00000000-0000-4000-8000-000000000004", "broken.fit", "parse_error")
];

function makeCheckResult(
  uploadedFileId: string,
  originalFilename: string,
  matchStatus: FileCheckResult["matchStatus"]
): FileCheckResult {
  return {
    uploadedFileId,
    originalFilename,
    parseStatus: matchStatus === "parse_error" ? "parse_error" : "parsed",
    matchStatus,
    confidenceScore: matchStatus === "match_confirmed" ? 1 : 0,
    reason: matchStatus,
    parsed: {
      startDate: "2026-04-14T08:00:00.000Z",
      distanceMeters: 1000,
      durationSeconds: 300,
      sportType: "Run"
    },
    matchedActivity:
      matchStatus === "match_confirmed"
        ? {
            id: "10000000-0000-4000-8000-000000000001",
            stravaActivityId: "123",
            name: "Lunch Run",
            startDate: "2026-04-14T08:00:00.000Z",
            distanceMeters: 1000,
            movingTimeSeconds: 300,
            sportType: "Run"
          }
        : null
  };
}
