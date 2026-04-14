import { z } from "zod";
import { matchStatusSchema, parseStatusSchema, uploadStatusSchema } from "../schemas/enums";

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional()
  })
});
export type ApiError = z.infer<typeof apiErrorSchema>;

export const activitySummaryResponseSchema = z.object({
  activityCount: z.number().int().nonnegative(),
  lastSyncedAt: z.string().datetime().nullable()
});
export type ActivitySummaryResponse = z.infer<typeof activitySummaryResponseSchema>;

export const activitySyncResponseSchema = z.object({
  syncedCount: z.number().int().nonnegative(),
  windowStart: z.string().datetime(),
  windowEnd: z.string().datetime(),
  lastSyncedAt: z.string().datetime()
});
export type ActivitySyncResponse = z.infer<typeof activitySyncResponseSchema>;

export const parsedActivityFileSchema = z.object({
  startDate: z.string().datetime().nullable(),
  distanceMeters: z.number().nullable(),
  durationSeconds: z.number().int().nullable(),
  sportType: z.string().nullable()
});
export type ParsedActivityFile = z.infer<typeof parsedActivityFileSchema>;

export const matchedActivitySchema = z.object({
  id: z.string().uuid(),
  stravaActivityId: z.string(),
  name: z.string(),
  startDate: z.string().datetime(),
  distanceMeters: z.number().nullable(),
  movingTimeSeconds: z.number().int().nullable(),
  sportType: z.string().nullable()
});
export type MatchedActivity = z.infer<typeof matchedActivitySchema>;

export const fileCheckResultSchema = z.object({
  uploadedFileId: z.string().uuid(),
  originalFilename: z.string(),
  parseStatus: parseStatusSchema,
  matchStatus: matchStatusSchema,
  confidenceScore: z.number(),
  reason: z.string(),
  parsed: parsedActivityFileSchema,
  matchedActivity: matchedActivitySchema.nullable()
});
export type FileCheckResult = z.infer<typeof fileCheckResultSchema>;

export const fileCheckResponseSchema = z.object({
  results: z.array(fileCheckResultSchema)
});
export type FileCheckResponse = z.infer<typeof fileCheckResponseSchema>;

export const fileChecksListResponseSchema = z.object({
  items: z.array(
    z.object({
      uploadedFileId: z.string().uuid(),
      originalFilename: z.string(),
      matchStatus: matchStatusSchema,
      confidenceScore: z.number(),
      reason: z.string(),
      checkedAt: z.string().datetime()
    })
  ),
  nextCursor: z.string().nullable()
});
export type FileChecksListResponse = z.infer<typeof fileChecksListResponseSchema>;

export const uploadMissingRequestSchema = z.object({
  uploadedFileIds: z.array(z.string().uuid()).min(1)
});
export type UploadMissingRequest = z.infer<typeof uploadMissingRequestSchema>;

export const uploadItemSchema = z.object({
  id: z.string().uuid(),
  uploadedFileId: z.string().uuid(),
  stravaUploadId: z.string().nullable(),
  externalId: z.string(),
  uploadStatus: uploadStatusSchema
});
export type UploadItem = z.infer<typeof uploadItemSchema>;

export const uploadMissingResponseSchema = z.object({
  uploads: z.array(uploadItemSchema),
  errors: z
    .array(
      z.object({
        uploadedFileId: z.string().uuid(),
        code: z.string(),
        message: z.string()
      })
    )
    .optional()
});
export type UploadMissingResponse = z.infer<typeof uploadMissingResponseSchema>;

export const uploadStatusResponseSchema = z.object({
  id: z.string().uuid(),
  uploadedFileId: z.string().uuid(),
  stravaUploadId: z.string().nullable(),
  stravaActivityId: z.string().nullable(),
  uploadStatus: uploadStatusSchema,
  errorMessage: z.string().nullable(),
  updatedAt: z.string().datetime()
});
export type UploadStatusResponse = z.infer<typeof uploadStatusResponseSchema>;

