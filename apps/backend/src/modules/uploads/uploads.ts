import { readFile } from "node:fs/promises";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../../db/client";
import { fileChecks, stravaUploads, uploadedFiles } from "../../db/schema";
import { HttpError } from "../../http/errors";
import { createStravaUpload, getStravaUpload, stravaId, type StravaUpload } from "../strava/client";
import { getUserWithFreshToken } from "../strava/tokens";

export async function submitMissingUploads(userId: string, uploadedFileIds: string[]) {
  const user = await getUserWithFreshToken(userId);
  const uploads = [];
  const errors = [];

  for (const uploadedFileId of uploadedFileIds) {
    const [file] = await db.select().from(uploadedFiles).where(and(eq(uploadedFiles.id, uploadedFileId), eq(uploadedFiles.userId, userId))).limit(1);
    if (!file) {
      errors.push({ uploadedFileId, code: "file_not_found", message: "Arquivo nao encontrado." });
      continue;
    }

    const [lastCheck] = await db
      .select()
      .from(fileChecks)
      .where(eq(fileChecks.uploadedFileId, uploadedFileId))
      .orderBy(desc(fileChecks.checkedAt))
      .limit(1);
    if (!lastCheck || lastCheck.matchStatus !== "not_found") {
      errors.push({ uploadedFileId, code: "not_uploadable", message: "Apenas arquivos not_found podem ser enviados." });
      continue;
    }

    const externalId = `strava-sync-${uploadedFileId}`;
    const dataType = file.originalFilename.split(".").pop()?.toLowerCase();
    if (!dataType || !["gpx", "tcx", "fit"].includes(dataType)) {
      errors.push({ uploadedFileId, code: "unsupported_file_type", message: "Tipo de arquivo nao suportado para upload." });
      continue;
    }

    let stravaUpload: StravaUpload;
    try {
      const blob = new Blob([await readFile(file.storedPath)]);
      stravaUpload = await createStravaUpload(user.accessToken, {
        file: blob,
        filename: file.originalFilename,
        dataType,
        externalId,
        name: file.originalFilename.replace(/\.(gpx|tcx|fit)$/i, "")
      });
    } catch (error) {
      errors.push({
        uploadedFileId,
        code: "strava_upload_failed",
        message: error instanceof Error ? error.message : "Strava upload failed"
      });
      continue;
    }

    const stravaUploadId = stravaId(stravaUpload.id, stravaUpload.id_str);
    const status = mapStravaUploadStatus(stravaUpload);
    const [upload] = await db
      .insert(stravaUploads)
      .values({
        uploadedFileId,
        stravaUploadId,
        stravaActivityId: stravaId(stravaUpload.activity_id, stravaUpload.activity_id_str),
        externalId,
        uploadStatus: status,
        errorMessage: stravaUpload.error ?? null,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: [stravaUploads.uploadedFileId],
        set: {
          stravaUploadId,
          stravaActivityId: stravaId(stravaUpload.activity_id, stravaUpload.activity_id_str),
          uploadStatus: status,
          errorMessage: stravaUpload.error ?? null,
          updatedAt: new Date()
        }
      })
      .returning();

    if (upload) {
      uploads.push({
        id: upload.id,
        uploadedFileId: upload.uploadedFileId,
        stravaUploadId: upload.stravaUploadId,
        externalId: upload.externalId,
        uploadStatus: upload.uploadStatus
      });
    }
  }

  return { uploads, errors: errors.length > 0 ? errors : undefined };
}

export async function getUploadStatus(userId: string, uploadId: string) {
  const user = await getUserWithFreshToken(userId);
  const [upload] = await db
    .select({
      id: stravaUploads.id,
      uploadedFileId: stravaUploads.uploadedFileId,
      stravaUploadId: stravaUploads.stravaUploadId,
      stravaActivityId: stravaUploads.stravaActivityId,
      uploadStatus: stravaUploads.uploadStatus,
      errorMessage: stravaUploads.errorMessage,
      updatedAt: stravaUploads.updatedAt
    })
    .from(stravaUploads)
    .innerJoin(uploadedFiles, eq(stravaUploads.uploadedFileId, uploadedFiles.id))
    .where(and(eq(stravaUploads.id, uploadId), eq(uploadedFiles.userId, userId)))
    .limit(1);

  if (!upload) throw new HttpError(404, "upload_not_found", "Upload not found");

  if (upload.stravaUploadId && ["pending", "submitted", "processing"].includes(upload.uploadStatus)) {
    const remote = await getStravaUpload(user.accessToken, upload.stravaUploadId);
    const status = mapStravaUploadStatus(remote);
    const [updated] = await db
      .update(stravaUploads)
      .set({
        stravaActivityId: stravaId(remote.activity_id, remote.activity_id_str),
        uploadStatus: status,
        errorMessage: remote.error ?? null,
        updatedAt: new Date()
      })
      .where(eq(stravaUploads.id, upload.id))
      .returning();
    if (updated) {
      return {
        id: updated.id,
        uploadedFileId: updated.uploadedFileId,
        stravaUploadId: updated.stravaUploadId,
        stravaActivityId: updated.stravaActivityId,
        uploadStatus: updated.uploadStatus,
        errorMessage: updated.errorMessage,
        updatedAt: updated.updatedAt.toISOString()
      };
    }
  }

  return {
    ...upload,
    updatedAt: upload.updatedAt.toISOString()
  };
}

export function mapStravaUploadStatus(upload: StravaUpload) {
  const status = upload.status?.toLowerCase() ?? "";
  if (upload.activity_id || upload.activity_id_str) return "uploaded" as const;
  if (upload.error?.toLowerCase().includes("duplicate")) return "duplicate" as const;
  if (upload.error) return "failed" as const;
  if (status.includes("duplicate")) return "duplicate" as const;
  if (status.includes("error") || status.includes("fail")) return "failed" as const;
  if (status.includes("ready")) return "uploaded" as const;
  if (status.includes("process")) return "processing" as const;
  return "submitted" as const;
}
