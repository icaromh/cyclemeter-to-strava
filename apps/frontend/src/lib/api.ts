import type {
  ActivitiesListResponse,
  ActivitySummaryResponse,
  ActivitySyncRequest,
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
    syncActivitiesRange(input: ActivitySyncRequest) {
      return request<ActivitySyncResponse>("/activities/sync", { method: "POST", body: JSON.stringify(input) });
    },
    activitySummary() {
      return request<ActivitySummaryResponse>("/activities/summary");
    },
    listActivities(options: { limit?: number; offset?: number; search?: string; sportType?: string } = {}) {
      const params = new URLSearchParams();
      params.set("limit", String(options.limit ?? 50));
      params.set("offset", String(options.offset ?? 0));
      if (options.search) params.set("search", options.search);
      if (options.sportType) params.set("sportType", options.sportType);
      return request<ActivitiesListResponse>(`/activities?${params.toString()}`);
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
