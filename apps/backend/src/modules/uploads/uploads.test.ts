import { describe, expect, it } from "vitest";
import { mapStravaUploadStatus } from "./uploads";

describe("mapStravaUploadStatus", () => {
  it("maps activity id to uploaded", () => {
    expect(mapStravaUploadStatus({ id: "1", activity_id: "99" })).toBe("uploaded");
  });

  it("maps duplicate errors to duplicate", () => {
    expect(mapStravaUploadStatus({ id: "1", error: "duplicate of activity" })).toBe("duplicate");
  });

  it("maps processing text to processing", () => {
    expect(mapStravaUploadStatus({ id: "1", status: "Your activity is still being processed." })).toBe("processing");
  });
});

