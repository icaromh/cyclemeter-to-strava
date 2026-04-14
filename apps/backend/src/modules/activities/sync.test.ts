import { beforeEach, describe, expect, it, vi } from "vitest";
import { getUserWithFreshToken } from "../strava/tokens";
import { listAthleteActivities } from "../strava/client";
import { db } from "../../db/client";
import { syncLast180Days } from "./sync";

vi.mock("../strava/tokens", () => ({
  getUserWithFreshToken: vi.fn()
}));

vi.mock("../strava/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../strava/client")>();
  return {
    ...actual,
    listAthleteActivities: vi.fn()
  };
});

vi.mock("../../db/client", () => ({
  db: {
    insert: vi.fn()
  }
}));

const tokenMock = vi.mocked(getUserWithFreshToken);
const listActivitiesMock = vi.mocked(listAthleteActivities);
const dbMock = vi.mocked(db);

function activity(index: number) {
  return {
    id: index,
    id_str: `activity-${index}`,
    name: `Activity ${index}`,
    sport_type: "Ride",
    start_date: "2026-04-01T10:00:00Z",
    timezone: "(GMT+01:00) Europe/Madrid",
    distance: 1234.56,
    moving_time: 500,
    elapsed_time: 600
  };
}

describe("syncLast180Days", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tokenMock.mockResolvedValue({ id: "user-1", accessToken: "access" } as Awaited<ReturnType<typeof getUserWithFreshToken>>);
    dbMock.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue(undefined)
      })
    } as never);
  });

  it("paginates activities and upserts by user and Strava id", async () => {
    listActivitiesMock
      .mockResolvedValueOnce(Array.from({ length: 100 }, (_, index) => activity(index + 1)))
      .mockResolvedValueOnce([activity(101)]);

    const result = await syncLast180Days("user-1");

    expect(result.syncedCount).toBe(101);
    expect(listActivitiesMock).toHaveBeenNthCalledWith(1, "access", expect.objectContaining({ page: 1, perPage: 100 }));
    expect(listActivitiesMock).toHaveBeenNthCalledWith(2, "access", expect.objectContaining({ page: 2, perPage: 100 }));
    expect(dbMock.insert).toHaveBeenCalledTimes(101);
  });

  it("stops paginating defensively after the max page count", async () => {
    listActivitiesMock.mockResolvedValue(Array.from({ length: 100 }, (_, index) => activity(index + 1)));

    const result = await syncLast180Days("user-1");

    expect(result.syncedCount).toBe(2000);
    expect(listActivitiesMock).toHaveBeenCalledTimes(20);
  });
});
