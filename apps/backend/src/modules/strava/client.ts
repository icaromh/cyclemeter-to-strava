import { env } from "../../config/env";
import { HttpError } from "../../http/errors";

const baseUrl = "https://www.strava.com/api/v3";
const oauthUrl = "https://www.strava.com/oauth/token";

export type StravaTokenResponse = {
  token_type: string;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete: {
    id: number | string;
    id_str?: string;
    username?: string | null;
    firstname?: string | null;
    lastname?: string | null;
  };
};

export type StravaActivity = {
  id: number | string;
  id_str?: string;
  external_id?: string | null;
  name: string;
  sport_type?: string;
  type?: string;
  start_date: string;
  timezone?: string;
  distance?: number;
  moving_time?: number;
  elapsed_time?: number;
};

export type StravaUpload = {
  id?: number | string;
  id_str?: string;
  activity_id?: number | string | null;
  activity_id_str?: string | null;
  status?: string;
  error?: string | null;
};

export function stravaId(value: string | number | undefined | null, idStr?: string | null) {
  if (idStr) return idStr;
  if (value === undefined || value === null) return null;
  return String(value);
}

async function parseStravaResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let details: unknown;
    try {
      details = await response.json();
    } catch {
      details = await response.text();
    }
    throw new HttpError(response.status, "strava_api_error", "Strava API request failed", details);
  }
  return response.json() as Promise<T>;
}

export function buildAuthorizationUrl(state: string) {
  const params = new URLSearchParams({
    client_id: env.STRAVA_CLIENT_ID,
    redirect_uri: env.STRAVA_REDIRECT_URI,
    response_type: "code",
    approval_prompt: "auto",
    scope: "activity:read_all,activity:write",
    state
  });
  return `https://www.strava.com/oauth/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string) {
  const response = await fetch(oauthUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.STRAVA_CLIENT_ID,
      client_secret: env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code"
    })
  });
  return parseStravaResponse<StravaTokenResponse>(response);
}

export async function refreshAccessToken(refreshToken: string) {
  const response = await fetch(oauthUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.STRAVA_CLIENT_ID,
      client_secret: env.STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    })
  });
  return parseStravaResponse<Omit<StravaTokenResponse, "athlete">>(response);
}

export async function listAthleteActivities(accessToken: string, options: { after: number; before?: number; page: number; perPage: number }) {
  const params = new URLSearchParams({
    after: String(options.after),
    page: String(options.page),
    per_page: String(options.perPage)
  });
  if (options.before !== undefined) params.set("before", String(options.before));
  const response = await fetch(`${baseUrl}/athlete/activities?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return parseStravaResponse<StravaActivity[]>(response);
}

export async function createStravaUpload(
  accessToken: string,
  input: { file: Blob; filename: string; dataType: string; externalId: string; name?: string }
) {
  const body = new FormData();
  body.set("file", input.file, input.filename);
  body.set("data_type", input.dataType);
  body.set("external_id", input.externalId);
  if (input.name) body.set("name", input.name);

  const response = await fetch(`${baseUrl}/uploads`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body
  });
  return parseStravaResponse<StravaUpload>(response);
}

export async function getStravaUpload(accessToken: string, uploadId: string) {
  const response = await fetch(`${baseUrl}/uploads/${uploadId}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return parseStravaResponse<StravaUpload>(response);
}
