import type {
  ActivitySummaryResponse,
  ActivitySyncResponse,
  FileCheckResponse,
  FileChecksListResponse,
  UploadMissingResponse,
  UploadStatusResponse
} from "@strava-sync/shared";

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

type Fetcher = typeof fetch;

export function createApiClient(baseUrl = apiUrl, fetcher: Fetcher = fetch) {
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

    const response = await fetcher(`${baseUrl}${path}`, {
      ...requestInit
    });
    const payloadText = await response.text();
    const payload = parseJsonPayload(payloadText);

    if (!response.ok) {
      throw new Error(payload?.error?.message ?? response.statusText ?? "Request failed");
    }
    return payload as T;
  }

  return {
    stravaLoginUrl(returnTo = "/dashboard") {
      return `${baseUrl}/auth/strava/start?returnTo=${encodeURIComponent(returnTo)}`;
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
}

export const api = createApiClient();

function parseJsonPayload(payloadText: string): { error?: { message?: string } } | null {
  if (!payloadText) return null;
  try {
    return JSON.parse(payloadText) as { error?: { message?: string } };
  } catch {
    return null;
  }
}
