import { beforeEach, describe, expect, it, vi } from "vitest";
import { HttpError } from "../../http/errors";
import {
  buildAuthorizationUrl,
  createStravaUpload,
  exchangeCodeForToken,
  listAthleteActivities,
  refreshAccessToken,
  stravaId
} from "./client";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

describe("strava client", () => {
  it("keeps Strava ids as strings and prefers id_str", () => {
    expect(stravaId(123, "9999999999999999999")).toBe("9999999999999999999");
    expect(stravaId(123, null)).toBe("123");
    expect(stravaId(null, null)).toBeNull();
  });

  it("requests the required OAuth scopes", () => {
    const url = new URL(buildAuthorizationUrl("state-123"));
    expect(url.searchParams.get("scope")).toBe("activity:read_all,activity:write");
    expect(url.searchParams.get("state")).toBe("state-123");
  });

  it("exchanges an OAuth code with Strava", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ access_token: "access", refresh_token: "refresh", expires_at: 1 }));

    await exchangeCodeForToken("code-123");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://www.strava.com/oauth/token",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"grant_type":"authorization_code"')
      })
    );
  });

  it("refreshes access tokens with the latest refresh token", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ access_token: "new-access", refresh_token: "new-refresh", expires_at: 1 }));

    const token = await refreshAccessToken("old-refresh");

    expect(token.refresh_token).toBe("new-refresh");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://www.strava.com/oauth/token",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"refresh_token":"old-refresh"')
      })
    );
  });

  it("lists activities with pagination parameters", async () => {
    fetchMock.mockResolvedValueOnce(Response.json([]));

    await listAthleteActivities("access", { after: 123, page: 3, perPage: 100 });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe("https://www.strava.com/api/v3/athlete/activities?after=123&page=3&per_page=100");
    expect(init).toEqual({ headers: { Authorization: "Bearer access" } });
  });

  it("sends upload data with external_id", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ id_str: "upload-1", status: "Your activity is still being processed." }));

    await createStravaUpload("access", {
      file: new Blob(["gpx"]),
      filename: "ride.gpx",
      dataType: "gpx",
      externalId: "strava-sync-file-1",
      name: "ride"
    });

    const [, init] = fetchMock.mock.calls[0]!;
    const body = init.body as FormData;
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ Authorization: "Bearer access" });
    expect(body.get("data_type")).toBe("gpx");
    expect(body.get("external_id")).toBe("strava-sync-file-1");
  });

  it("maps non-ok Strava responses to HttpError", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ message: "Rate Limit Exceeded" }, { status: 429 }));

    await expect(listAthleteActivities("access", { after: 1, page: 1, perPage: 100 })).rejects.toMatchObject({
      status: 429,
      code: "strava_api_error"
    });
  });
});
