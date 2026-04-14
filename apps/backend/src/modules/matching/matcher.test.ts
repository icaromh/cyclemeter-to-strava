import { beforeEach, describe, expect, it, vi } from "vitest";
import { matchFile, normalizeExternalId } from "./matcher";
import { findActivityByExternalId, listCandidateActivities } from "../activities/sync";
import { findCompletedUploadByExternalId } from "../uploads/lookup";

vi.mock("../activities/sync", () => ({
  findActivityByExternalId: vi.fn(),
  listCandidateActivities: vi.fn()
}));
vi.mock("../uploads/lookup", () => ({
  findCompletedUploadByExternalId: vi.fn()
}));

const mockedFindActivityByExternalId = vi.mocked(findActivityByExternalId);
const mockedListCandidateActivities = vi.mocked(listCandidateActivities);
const mockedFindCompletedUploadByExternalId = vi.mocked(findCompletedUploadByExternalId);

function candidate(overrides: Partial<Awaited<ReturnType<typeof listCandidateActivities>>[number]> = {}) {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    userId: "00000000-0000-0000-0000-000000000002",
    stravaActivityId: "1234567890123456789",
    externalId: null,
    name: "Morning Ride",
    sportType: "Ride",
    startDate: new Date("2026-04-10T06:31:00.000Z"),
    timezone: "Europe/Madrid",
    distanceMeters: "10050.00",
    movingTimeSeconds: 3605,
    elapsedTimeSeconds: 3700,
    rawJson: {},
    syncedAt: new Date("2026-04-10T08:00:00.000Z"),
    ...overrides
  };
}

describe("matchFile", () => {
  beforeEach(() => {
    mockedFindActivityByExternalId.mockReset();
    mockedFindActivityByExternalId.mockResolvedValue(null);
    mockedFindCompletedUploadByExternalId.mockReset();
    mockedFindCompletedUploadByExternalId.mockResolvedValue(null);
    mockedListCandidateActivities.mockReset();
  });

  it("normalizes uploaded filenames for external id matching", () => {
    expect(normalizeExternalId("/tmp/uploads/Cycle-20260414-0856-51349.fit")).toBe("Cycle-20260414-0856-51349.fit");
    expect(normalizeExternalId(" Cycle-20260414-0856-51349.fit ")).toBe("Cycle-20260414-0856-51349.fit");
    expect(normalizeExternalId("")).toBeNull();
  });

  it("confirms a match when uploaded filename equals Strava external id", async () => {
    mockedFindActivityByExternalId.mockResolvedValue(candidate({ externalId: "Cycle-20260414-0856-51349.fit" }));

    const result = await matchFile(
      "user-1",
      { startDate: null, distanceMeters: null, durationSeconds: null, sportType: null },
      null,
      { originalFilename: "Cycle-20260414-0856-51349.fit" }
    );

    expect(mockedFindActivityByExternalId).toHaveBeenCalledWith("user-1", "Cycle-20260414-0856-51349.fit");
    expect(mockedListCandidateActivities).not.toHaveBeenCalled();
    expect(result.status).toBe("match_confirmed");
    expect(result.confidenceScore).toBe(1);
    expect(result.reason).toContain("External ID");
  });

  it("confirms a match when a previous Strava upload was marked duplicate for the filename", async () => {
    mockedFindCompletedUploadByExternalId.mockResolvedValue({
      externalId: "Cycle-20250801-1655-54126.fit",
      uploadStatus: "duplicate",
      stravaActivityId: "18106372042",
      errorMessage: "Cycle-20250801-1655-54126.fit duplicate of <a href='/activities/18106372042' target='_blank'>Cycle</a>",
      activity: null
    });

    const result = await matchFile(
      "user-1",
      { startDate: null, distanceMeters: null, durationSeconds: null, sportType: null },
      null,
      { originalFilename: "Cycle-20250801-1655-54126.fit" }
    );

    expect(mockedFindCompletedUploadByExternalId).toHaveBeenCalledWith("user-1", "Cycle-20250801-1655-54126.fit");
    expect(mockedListCandidateActivities).not.toHaveBeenCalled();
    expect(result.status).toBe("match_confirmed");
    expect(result.confidenceScore).toBe(1);
    expect(result.reason).toContain("duplicado pelo Strava");
    expect(result.reason).toContain("18106372042");
    expect(result.candidate).toBeNull();
  });

  it("returns parse_error when parsing failed", async () => {
    const result = await matchFile(
      "user-1",
      { startDate: null, distanceMeters: null, durationSeconds: null, sportType: null },
      "invalid file"
    );

    expect(result.status).toBe("parse_error");
    expect(result.confidenceScore).toBe(0);
    expect(mockedListCandidateActivities).not.toHaveBeenCalled();
  });

  it("confirms a match when distance, duration and type are within tolerance", async () => {
    mockedListCandidateActivities.mockResolvedValue([candidate()]);

    const result = await matchFile("user-1", {
      startDate: new Date("2026-04-10T06:30:00.000Z"),
      distanceMeters: 10_000,
      durationSeconds: 3600,
      sportType: "Ride"
    });

    expect(mockedListCandidateActivities).toHaveBeenCalledWith(
      "user-1",
      new Date("2026-04-10T06:30:00.000Z"),
      600_000
    );
    expect(result.status).toBe("match_confirmed");
    expect(result.candidate?.id).toBe("00000000-0000-0000-0000-000000000001");
    expect(result.confidenceScore).toBeGreaterThanOrEqual(0.86);
  });

  it("treats activity type as a penalty instead of a hard block", async () => {
    mockedListCandidateActivities.mockResolvedValue([candidate({ sportType: "Run" })]);

    const result = await matchFile("user-1", {
      startDate: new Date("2026-04-10T06:30:00.000Z"),
      distanceMeters: 10_000,
      durationSeconds: 3600,
      sportType: "Ride"
    });

    expect(result.status).toBe("match_probable");
    expect(result.confidenceScore).toBeLessThan(1);
  });

  it("returns probable for nearby candidates with partial metric drift", async () => {
    mockedListCandidateActivities.mockResolvedValue([
      candidate({ distanceMeters: "10550.00", movingTimeSeconds: 3850 })
    ]);

    const result = await matchFile("user-1", {
      startDate: new Date("2026-04-10T06:30:00.000Z"),
      distanceMeters: 10_000,
      durationSeconds: 3600,
      sportType: "Ride"
    });

    expect(result.status).toBe("match_probable");
    expect(result.candidate).not.toBeNull();
  });

  it("returns not_found when candidates are too far away in distance and duration", async () => {
    mockedListCandidateActivities.mockResolvedValue([
      candidate({ distanceMeters: "15000.00", movingTimeSeconds: 5400 })
    ]);

    const result = await matchFile("user-1", {
      startDate: new Date("2026-04-10T06:30:00.000Z"),
      distanceMeters: 10_000,
      durationSeconds: 3600,
      sportType: "Ride"
    });

    expect(result.status).toBe("not_found");
    expect(result.candidate).toBeNull();
  });

  it("returns not_found when there are no candidates in the time window", async () => {
    mockedListCandidateActivities.mockResolvedValue([]);

    const result = await matchFile("user-1", {
      startDate: new Date("2026-04-10T06:30:00.000Z"),
      distanceMeters: 10_000,
      durationSeconds: 3600,
      sportType: "Ride"
    });

    expect(result.status).toBe("not_found");
    expect(result.reason).toContain("+/-10 minutos");
  });
});
