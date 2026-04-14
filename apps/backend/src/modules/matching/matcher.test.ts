import { beforeEach, describe, expect, it, vi } from "vitest";
import { matchFile } from "./matcher";
import { listCandidateActivities } from "../activities/sync";

vi.mock("../activities/sync", () => ({
  listCandidateActivities: vi.fn()
}));

const mockedListCandidateActivities = vi.mocked(listCandidateActivities);

function candidate(overrides: Partial<Awaited<ReturnType<typeof listCandidateActivities>>[number]> = {}) {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    userId: "00000000-0000-0000-0000-000000000002",
    stravaActivityId: "1234567890123456789",
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
    mockedListCandidateActivities.mockReset();
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
