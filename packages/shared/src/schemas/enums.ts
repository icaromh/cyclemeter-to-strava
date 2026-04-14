import { z } from "zod";

export const parseStatusSchema = z.enum(["pending", "parsed", "parse_error"]);
export type ParseStatus = z.infer<typeof parseStatusSchema>;

export const matchStatusSchema = z.enum([
  "match_confirmed",
  "match_probable",
  "not_found",
  "parse_error"
]);
export type MatchStatus = z.infer<typeof matchStatusSchema>;

export const uploadStatusSchema = z.enum([
  "pending",
  "submitted",
  "processing",
  "uploaded",
  "duplicate",
  "failed"
]);
export type UploadStatus = z.infer<typeof uploadStatusSchema>;

export const activitySportTypeSchema = z.string().min(1).nullable();

