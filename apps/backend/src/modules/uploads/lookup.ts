import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db/client";
import { stravaActivities, stravaUploads, uploadedFiles } from "../../db/schema";
import { extractActivityIdFromUploadError } from "./uploads";

export async function findCompletedUploadByExternalId(userId: string, externalId: string) {
  const [match] = await db
    .select({
      upload: stravaUploads,
      activity: stravaActivities
    })
    .from(stravaUploads)
    .innerJoin(uploadedFiles, eq(stravaUploads.uploadedFileId, uploadedFiles.id))
    .leftJoin(
      stravaActivities,
      and(
        eq(stravaActivities.userId, uploadedFiles.userId),
        eq(stravaActivities.stravaActivityId, stravaUploads.stravaActivityId)
      )
    )
    .where(
      and(
        eq(uploadedFiles.userId, userId),
        eq(stravaUploads.externalId, externalId),
        inArray(stravaUploads.uploadStatus, ["uploaded", "duplicate"])
      )
    )
    .orderBy(desc(stravaUploads.updatedAt))
    .limit(1);

  if (!match) return null;

  return {
    externalId: match.upload.externalId,
    uploadStatus: match.upload.uploadStatus,
    stravaActivityId: match.upload.stravaActivityId ?? extractActivityIdFromUploadError(match.upload.errorMessage),
    errorMessage: match.upload.errorMessage,
    activity: match.activity
  };
}

export async function backfillUploadActivityIdFromError(uploadId: string, errorMessage: string | null | undefined) {
  const stravaActivityId = extractActivityIdFromUploadError(errorMessage);
  if (!stravaActivityId) return null;

  const [updated] = await db
    .update(stravaUploads)
    .set({
      stravaActivityId,
      updatedAt: sql`now()`
    })
    .where(and(eq(stravaUploads.id, uploadId), sql`${stravaUploads.stravaActivityId} is null`))
    .returning();

  return updated ?? null;
}
