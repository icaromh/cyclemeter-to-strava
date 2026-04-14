import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../db/client";
import { refreshAccessToken } from "./client";
import { getUserWithFreshToken } from "./tokens";

vi.mock("../../db/client", () => ({
  db: {
    select: vi.fn(),
    update: vi.fn()
  }
}));

vi.mock("./client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./client")>();
  return {
    ...actual,
    refreshAccessToken: vi.fn()
  };
});

const dbMock = vi.mocked(db);
const refreshMock = vi.mocked(refreshAccessToken);

function user(expiresAt: Date) {
  return {
    id: "user-1",
    refreshToken: "old-refresh",
    accessToken: "old-access",
    tokenExpiresAt: expiresAt
  };
}

describe("getUserWithFreshToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the existing user when the token is still fresh", async () => {
    const freshUser = user(new Date(Date.now() + 120_000));
    dbMock.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([freshUser])
        })
      })
    } as never);

    await expect(getUserWithFreshToken("user-1")).resolves.toBe(freshUser);
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("persists the newest refresh token after refreshing", async () => {
    const expiredUser = user(new Date(Date.now() - 1));
    const updatedUser = { ...expiredUser, accessToken: "new-access", refreshToken: "new-refresh" };
    const returning = vi.fn().mockResolvedValue([updatedUser]);
    const set = vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning }) });

    dbMock.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([expiredUser])
        })
      })
    } as never);
    dbMock.update.mockReturnValue({ set } as never);
    refreshMock.mockResolvedValue({
      token_type: "Bearer",
      access_token: "new-access",
      refresh_token: "new-refresh",
      expires_at: 1_800_000_000
    });

    await expect(getUserWithFreshToken("user-1")).resolves.toBe(updatedUser);
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ accessToken: "new-access", refreshToken: "new-refresh" }));
  });
});
