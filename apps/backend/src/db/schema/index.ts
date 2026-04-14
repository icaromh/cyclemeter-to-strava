import {
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const parseStatus = pgEnum("parse_status", ["pending", "parsed", "parse_error"]);
export const matchStatus = pgEnum("match_status", [
  "match_confirmed",
  "match_probable",
  "not_found",
  "parse_error"
]);
export const uploadStatus = pgEnum("upload_status", [
  "pending",
  "submitted",
  "processing",
  "uploaded",
  "duplicate",
  "failed"
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  stravaAthleteId: text("strava_athlete_id").notNull(),
  username: text("username"),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }).notNull(),
  acceptedScopes: text("accepted_scopes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  stravaAthleteUnique: uniqueIndex("users_strava_athlete_id_unique").on(table.stravaAthleteId)
}));

export const stravaActivities = pgTable("strava_activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  stravaActivityId: text("strava_activity_id").notNull(),
  externalId: text("external_id"),
  name: text("name").notNull(),
  sportType: text("sport_type"),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  timezone: text("timezone"),
  distanceMeters: numeric("distance_meters", { precision: 12, scale: 2 }),
  movingTimeSeconds: integer("moving_time_seconds"),
  elapsedTimeSeconds: integer("elapsed_time_seconds"),
  rawJson: jsonb("raw_json").notNull(),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  userActivityUnique: uniqueIndex("strava_activities_user_strava_activity_unique").on(
    table.userId,
    table.stravaActivityId
  ),
  userStartDateIdx: index("strava_activities_user_start_date_idx").on(table.userId, table.startDate),
  userExternalIdIdx: index("strava_activities_user_external_id_idx").on(table.userId, table.externalId)
}));

export const uploadedFiles = pgTable("uploaded_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  originalFilename: text("original_filename").notNull(),
  storedPath: text("stored_path").notNull(),
  mimeType: text("mime_type"),
  fileSize: integer("file_size").notNull(),
  fileHash: text("file_hash").notNull(),
  parsedStartDate: timestamp("parsed_start_date", { withTimezone: true }),
  parsedDistanceMeters: numeric("parsed_distance_meters", { precision: 12, scale: 2 }),
  parsedDurationSeconds: integer("parsed_duration_seconds"),
  parsedSportType: text("parsed_sport_type"),
  parseStatus: parseStatus("parse_status").notNull().default("pending"),
  parseError: text("parse_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  userHashUnique: uniqueIndex("uploaded_files_user_file_hash_unique").on(table.userId, table.fileHash),
  userCreatedAtIdx: index("uploaded_files_user_created_at_idx").on(table.userId, table.createdAt)
}));

export const fileChecks = pgTable("file_checks", {
  id: uuid("id").primaryKey().defaultRandom(),
  uploadedFileId: uuid("uploaded_file_id").notNull().references(() => uploadedFiles.id, { onDelete: "cascade" }),
  matchedStravaActivityId: uuid("matched_strava_activity_id").references(() => stravaActivities.id, {
    onDelete: "set null"
  }),
  matchStatus: matchStatus("match_status").notNull(),
  confidenceScore: numeric("confidence_score", { precision: 5, scale: 4 }).notNull(),
  reason: text("reason").notNull(),
  checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  uploadedFileIdx: index("file_checks_uploaded_file_id_idx").on(table.uploadedFileId),
  matchStatusIdx: index("file_checks_match_status_idx").on(table.matchStatus)
}));

export const stravaUploads = pgTable("strava_uploads", {
  id: uuid("id").primaryKey().defaultRandom(),
  uploadedFileId: uuid("uploaded_file_id").notNull().references(() => uploadedFiles.id, { onDelete: "cascade" }),
  stravaUploadId: text("strava_upload_id"),
  stravaActivityId: text("strava_activity_id"),
  externalId: text("external_id").notNull(),
  uploadStatus: uploadStatus("upload_status").notNull().default("pending"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  uploadedFileUnique: uniqueIndex("strava_uploads_uploaded_file_id_unique").on(table.uploadedFileId),
  externalIdUnique: uniqueIndex("strava_uploads_external_id_unique").on(table.externalId),
  statusIdx: index("strava_uploads_status_idx").on(table.uploadStatus)
}));

export const usersRelations = relations(users, ({ many }) => ({
  activities: many(stravaActivities),
  files: many(uploadedFiles)
}));

export const uploadedFilesRelations = relations(uploadedFiles, ({ one, many }) => ({
  user: one(users, { fields: [uploadedFiles.userId], references: [users.id] }),
  checks: many(fileChecks),
  upload: one(stravaUploads)
}));
