ALTER TABLE "strava_activities"
  ADD COLUMN IF NOT EXISTS "external_id" text;

UPDATE "strava_activities"
SET "external_id" = raw_json->>'external_id'
WHERE "external_id" IS NULL
  AND raw_json ? 'external_id';

CREATE INDEX IF NOT EXISTS "strava_activities_user_external_id_idx"
  ON "strava_activities" ("user_id", "external_id");

