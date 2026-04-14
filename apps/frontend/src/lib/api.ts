import type {
  ActivitySummaryResponse,
  ActivitySyncResponse,
  FileCheckResponse,
  FileChecksListResponse,
  UploadMissingResponse,
  UploadStatusResponse
} from "@strava-sync/shared";

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const requestInit: RequestInit = {
    ...init,
    credentials: "include"
  };
  if (!(init?.body instanceof FormData)) {
    requestInit.headers = { "Content-Type": "application/json", ...init?.headers };
  } else if (init.headers) {
    requestInit.headers = init.headers;
  }

  const response = await fetch(`${apiUrl}${path}`, {
    ...requestInit
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(error.error?.message ?? "Request failed");
  }
  return response.json() as Promise<T>;
}

export const api = {
  stravaLoginUrl(returnTo = "/dashboard") {
    return `${apiUrl}/auth/strava/start?returnTo=${encodeURIComponent(returnTo)}`;
  },
  syncActivities() {
    return request<ActivitySyncResponse>("/activities/sync-180d", { method: "POST", body: JSON.stringify({}) });
  },
  activitySummary() {
    return request<ActivitySummaryResponse>("/activities/summary");
  },
  checkFiles(files: File[]) {
    const form = new FormData();
    for (const file of files) form.append("files[]", file);
    return request<FileCheckResponse>("/files/check", { method: "POST", body: form });
  },
  listChecks(status?: string) {
    const params = new URLSearchParams();
    if (status && status !== "all") params.set("status", status);
    params.set("limit", "100");
    return request<FileChecksListResponse>(`/files/checks?${params.toString()}`);
  },
  uploadMissing(uploadedFileIds: string[]) {
    return request<UploadMissingResponse>("/uploads/missing", {
      method: "POST",
      body: JSON.stringify({ uploadedFileIds })
    });
  },
  uploadStatus(id: string) {
    return request<UploadStatusResponse>(`/uploads/status/${id}`);
  }
};
