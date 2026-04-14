UPDATE "strava_uploads" AS upload
SET "external_id" = file."original_filename",
    "updated_at" = now()
FROM "uploaded_files" AS file
WHERE upload."uploaded_file_id" = file."id"
  AND upload."external_id" LIKE 'strava-sync-%'
  AND file."original_filename" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "strava_uploads" AS existing
    WHERE existing."external_id" = file."original_filename"
      AND existing."id" <> upload."id"
  );

UPDATE "strava_activities" AS activity
SET "external_id" = upload."external_id"
FROM "strava_uploads" AS upload
JOIN "uploaded_files" AS file ON file."id" = upload."uploaded_file_id"
WHERE activity."user_id" = file."user_id"
  AND activity."strava_activity_id" = upload."strava_activity_id"
  AND upload."strava_activity_id" IS NOT NULL
  AND upload."external_id" IS NOT NULL;

