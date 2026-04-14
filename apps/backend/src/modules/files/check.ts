import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { and, desc, eq } from "drizzle-orm";
import type { FileCheckResult } from "@strava-sync/shared";
import { db } from "../../db/client";
import { fileChecks, uploadedFiles } from "../../db/schema";
import { env } from "../../config/env";
import { HttpError } from "../../http/errors";
import { parseActivityFile, type ParsedFile } from "./parser";
import { matchFile } from "../matching/matcher";

const allowedExtensions = new Set([".gpx", ".tcx", ".fit"]);

export async function checkUploadedFiles(userId: string, files: File[]) {
  await mkdir(env.UPLOAD_DIR, { recursive: true });
  const results: FileCheckResult[] = [];

  for (const file of files) {
    const extension = extname(file.name).toLowerCase();
    if (!allowedExtensions.has(extension)) {
      throw new HttpError(400, "unsupported_file_type", `Unsupported file extension: ${extension}`);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const hash = createHash("sha256").update(buffer).digest("hex");
    const [existingUpload] = await db
      .select()
      .from(uploadedFiles)
      .where(and(eq(uploadedFiles.userId, userId), eq(uploadedFiles.fileHash, hash)))
      .limit(1);

    const uploaded = existingUpload ?? (await persistNewUpload(userId, file, extension, buffer, hash));
    if (!uploaded) throw new HttpError(500, "file_save_failed", "Could not persist uploaded file");
    const parsed = existingUpload
      ? parsedFromUpload(existingUpload)
      : {
          startDate: uploaded.parsedStartDate,
          distanceMeters: uploaded.parsedDistanceMeters === null ? null : Number(uploaded.parsedDistanceMeters),
          durationSeconds: uploaded.parsedDurationSeconds,
          sportType: uploaded.parsedSportType
        };
    const parseError = uploaded.parseError;

    const match = await matchFile(userId, parsed, parseError, { originalFilename: uploaded.originalFilename });
    await db.insert(fileChecks).values({
      uploadedFileId: uploaded.id,
      matchedStravaActivityId: match.candidate?.id ?? null,
      matchStatus: match.status,
      confidenceScore: String(match.confidenceScore),
      reason: existingUpload ? `Arquivo duplicado ja enviado anteriormente. ${match.reason}` : match.reason
    });

    results.push(toFileCheckResult(uploaded, parsed, match, existingUpload !== undefined));
  }

  return results;
}

async function persistNewUpload(userId: string, file: File, extension: string, buffer: Buffer, hash: string) {
  const storedPath = join(env.UPLOAD_DIR, `${randomUUID()}${extension}`);
  await writeFile(storedPath, buffer);

  let parsed: ParsedFile = { startDate: null, distanceMeters: null, durationSeconds: null, sportType: null };
  let parseError: string | null = null;
  try {
    parsed = await parseActivityFile(file.name, buffer);
  } catch (error) {
    parseError = error instanceof Error ? error.message : "Could not parse file";
  }

  const [uploaded] = await db
    .insert(uploadedFiles)
    .values({
      userId,
      originalFilename: file.name,
      storedPath,
      mimeType: file.type || null,
      fileSize: file.size,
      fileHash: hash,
      parsedStartDate: parsed.startDate,
      parsedDistanceMeters: parsed.distanceMeters === null ? null : String(parsed.distanceMeters),
      parsedDurationSeconds: toIntegerOrNull(parsed.durationSeconds),
      parsedSportType: parsed.sportType,
      parseStatus: parseError ? "parse_error" : "parsed",
      parseError
    })
    .onConflictDoUpdate({
      target: [uploadedFiles.userId, uploadedFiles.fileHash],
      set: {
        originalFilename: file.name,
        storedPath,
        mimeType: file.type || null,
        fileSize: file.size,
        parsedStartDate: parsed.startDate,
        parsedDistanceMeters: parsed.distanceMeters === null ? null : String(parsed.distanceMeters),
        parsedDurationSeconds: toIntegerOrNull(parsed.durationSeconds),
        parsedSportType: parsed.sportType,
        parseStatus: parseError ? "parse_error" : "parsed",
        parseError
      }
    })
    .returning();

  return uploaded;
}

function toIntegerOrNull(value: number | null) {
  return value === null ? null : Math.round(value);
}

type UploadedFileRow = NonNullable<Awaited<ReturnType<typeof persistNewUpload>>>;
type MatchResult = Awaited<ReturnType<typeof matchFile>>;

function parsedFromUpload(uploaded: UploadedFileRow): ParsedFile {
  return {
    startDate: uploaded.parsedStartDate,
    distanceMeters: uploaded.parsedDistanceMeters === null ? null : Number(uploaded.parsedDistanceMeters),
    durationSeconds: uploaded.parsedDurationSeconds,
    sportType: uploaded.parsedSportType
  };
}

function toFileCheckResult(
  uploaded: UploadedFileRow,
  parsed: ParsedFile,
  match: MatchResult,
  duplicate: boolean
): FileCheckResult {
  const reason = duplicate ? `Arquivo duplicado ja enviado anteriormente. ${match.reason}` : match.reason;
  return {
    uploadedFileId: uploaded.id,
    originalFilename: uploaded.originalFilename,
    parseStatus: uploaded.parseStatus,
    matchStatus: match.status,
    confidenceScore: match.confidenceScore,
    reason,
    parsed: {
      startDate: parsed.startDate?.toISOString() ?? null,
      distanceMeters: parsed.distanceMeters,
      durationSeconds: parsed.durationSeconds,
      sportType: parsed.sportType
    },
    matchedActivity: match.candidate
      ? {
          id: match.candidate.id,
          stravaActivityId: match.candidate.stravaActivityId,
          name: match.candidate.name,
          startDate: match.candidate.startDate.toISOString(),
          distanceMeters: match.candidate.distanceMeters === null ? null : Number(match.candidate.distanceMeters),
          movingTimeSeconds: match.candidate.movingTimeSeconds,
          sportType: match.candidate.sportType
        }
      : null
  };
}

export async function listRecentChecks(userId: string, status?: string | null, limit = 50) {
  const rows = await db
    .select({
      uploadedFileId: uploadedFiles.id,
      originalFilename: uploadedFiles.originalFilename,
      matchStatus: fileChecks.matchStatus,
      confidenceScore: fileChecks.confidenceScore,
      reason: fileChecks.reason,
      checkedAt: fileChecks.checkedAt
    })
    .from(fileChecks)
    .innerJoin(uploadedFiles, eq(fileChecks.uploadedFileId, uploadedFiles.id))
    .where(eq(uploadedFiles.userId, userId))
    .orderBy(desc(fileChecks.checkedAt))
    .limit(limit);

  return {
    items: rows
      .filter((row) => !status || row.matchStatus === status)
      .map((row) => ({
        uploadedFileId: row.uploadedFileId,
        originalFilename: row.originalFilename,
        matchStatus: row.matchStatus,
        confidenceScore: Number(row.confidenceScore),
        reason: row.reason,
        checkedAt: row.checkedAt.toISOString()
      })),
    nextCursor: null
  };
}
