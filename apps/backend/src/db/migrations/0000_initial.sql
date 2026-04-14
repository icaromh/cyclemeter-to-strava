CREATE TYPE "parse_status" AS ENUM ('pending', 'parsed', 'parse_error');
CREATE TYPE "match_status" AS ENUM ('match_confirmed', 'match_probable', 'not_found', 'parse_error');
CREATE TYPE "upload_status" AS ENUM ('pending', 'submitted', 'processing', 'uploaded', 'duplicate', 'failed');

CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "strava_athlete_id" text NOT NULL,
  "username" text,
  "access_token" text NOT NULL,
  "refresh_token" text NOT NULL,
  "token_expires_at" timestamptz NOT NULL,
  "accepted_scopes" text DEFAULT '' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE "strava_activities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "strava_activity_id" text NOT NULL,
  "name" text NOT NULL,
  "sport_type" text,
  "start_date" timestamptz NOT NULL,
  "timezone" text,
  "distance_meters" numeric(12, 2),
  "moving_time_seconds" integer,
  "elapsed_time_seconds" integer,
  "raw_json" jsonb NOT NULL,
  "synced_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE "uploaded_files" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "original_filename" text NOT NULL,
  "stored_path" text NOT NULL,
  "mime_type" text,
  "file_size" integer NOT NULL,
  "file_hash" text NOT NULL,
  "parsed_start_date" timestamptz,
  "parsed_distance_meters" numeric(12, 2),
  "parsed_duration_seconds" integer,
  "parsed_sport_type" text,
  "parse_status" "parse_status" DEFAULT 'pending' NOT NULL,
  "parse_error" text,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE "file_checks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "uploaded_file_id" uuid NOT NULL REFERENCES "uploaded_files"("id") ON DELETE cascade,
  "matched_strava_activity_id" uuid REFERENCES "strava_activities"("id") ON DELETE set null,
  "match_status" "match_status" NOT NULL,
  "confidence_score" numeric(5, 4) NOT NULL,
  "reason" text NOT NULL,
  "checked_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE "strava_uploads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "uploaded_file_id" uuid NOT NULL REFERENCES "uploaded_files"("id") ON DELETE cascade,
  "strava_upload_id" text,
  "strava_activity_id" text,
  "external_id" text NOT NULL,
  "upload_status" "upload_status" DEFAULT 'pending' NOT NULL,
  "error_message" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "users_strava_athlete_id_unique" ON "users" ("strava_athlete_id");
CREATE UNIQUE INDEX "strava_activities_user_strava_activity_unique" ON "strava_activities" ("user_id", "strava_activity_id");
CREATE INDEX "strava_activities_user_start_date_idx" ON "strava_activities" ("user_id", "start_date");
CREATE UNIQUE INDEX "uploaded_files_user_file_hash_unique" ON "uploaded_files" ("user_id", "file_hash");
CREATE INDEX "uploaded_files_user_created_at_idx" ON "uploaded_files" ("user_id", "created_at");
CREATE INDEX "file_checks_uploaded_file_id_idx" ON "file_checks" ("uploaded_file_id");
CREATE INDEX "file_checks_match_status_idx" ON "file_checks" ("match_status");
CREATE UNIQUE INDEX "strava_uploads_uploaded_file_id_unique" ON "strava_uploads" ("uploaded_file_id");
CREATE UNIQUE INDEX "strava_uploads_external_id_unique" ON "strava_uploads" ("external_id");
CREATE INDEX "strava_uploads_status_idx" ON "strava_uploads" ("upload_status");

