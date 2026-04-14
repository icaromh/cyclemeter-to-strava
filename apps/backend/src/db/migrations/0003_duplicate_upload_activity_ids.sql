UPDATE "strava_uploads"
SET "strava_activity_id" = substring("error_message" from '/activities/([0-9]+)'),
    "updated_at" = now()
WHERE "strava_activity_id" IS NULL
  AND "error_message" ~ '/activities/[0-9]+';

UPDATE "strava_activities" AS activity
SET "external_id" = upload."external_id"
FROM "strava_uploads" AS upload
JOIN "uploaded_files" AS file ON file."id" = upload."uploaded_file_id"
WHERE activity."user_id" = file."user_id"
  AND activity."strava_activity_id" = upload."strava_activity_id"
  AND upload."strava_activity_id" IS NOT NULL
  AND upload."external_id" IS NOT NULL
  AND activity."external_id" IS NULL;
