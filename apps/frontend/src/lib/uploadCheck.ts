import type {
  FileCheckResult,
  UploadItem,
  UploadMissingResponse,
  UploadStatus,
  UploadStatusResponse
} from "@strava-sync/shared";

export const uploadTerminalStatuses = ["uploaded", "duplicate", "failed"] as const satisfies readonly UploadStatus[];

export function isUploadTerminal(status: UploadStatus) {
  return uploadTerminalStatuses.includes(status as (typeof uploadTerminalStatuses)[number]);
}

export function filterFileChecks(results: FileCheckResult[], status: FileCheckResult["matchStatus"] | "all") {
  return status === "all" ? results : results.filter((result) => result.matchStatus === status);
}

export function getUploadableFileIds(results: FileCheckResult[]) {
  return results.filter((result) => result.matchStatus === "not_found").map((result) => result.uploadedFileId);
}

export function getCurrentUploadStatus(upload: UploadItem, status?: UploadStatusResponse) {
  return status?.uploadStatus ?? upload.uploadStatus;
}

export function getUploadErrors(response?: UploadMissingResponse) {
  return response?.errors ?? [];
}

export function getUploadProgressValue(status: UploadStatus) {
  switch (status) {
    case "pending":
      return 20;
    case "submitted":
      return 45;
    case "processing":
      return 75;
    case "uploaded":
    case "duplicate":
    case "failed":
      return 100;
  }
}
