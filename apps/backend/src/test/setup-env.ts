process.env.NODE_ENV = "test";
process.env.DATABASE_URL ??= "postgres://strava_sync:strava_sync@localhost:5432/strava_sync";
process.env.STRAVA_REDIRECT_URI ??= "http://localhost:3000/auth/strava/callback";
process.env.SESSION_SECRET ??= "test-secret-with-enough-length-for-hmac";
process.env.FRONTEND_URL ??= "http://localhost:5173";

