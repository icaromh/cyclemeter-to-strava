import { Hono } from "hono";
import { buildAuthorizationUrl } from "../../modules/strava/client";
import { completeOAuth, frontendRedirectUrl, makeOauthState, parseOauthState } from "../../modules/auth/oauth";
import { HttpError } from "../errors";
import { setSession } from "../middleware/session";

export const authRoutes = new Hono();

authRoutes.get("/strava/start", (c) => {
  const state = makeOauthState(c.req.query("returnTo") ?? "/");
  return c.redirect(buildAuthorizationUrl(state));
});

authRoutes.get("/strava/callback", async (c) => {
  const code = c.req.query("code");
  if (!code) throw new HttpError(400, "missing_code", "OAuth callback is missing code");

  const user = await completeOAuth({ code, scope: c.req.query("scope") ?? null });
  setSession(c, user.id);
  const { returnTo } = parseOauthState(c.req.query("state") ?? null);
  return c.redirect(frontendRedirectUrl(returnTo));
});

