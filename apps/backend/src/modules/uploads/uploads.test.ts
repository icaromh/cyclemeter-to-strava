import { describe, expect, it } from "vitest";
import { activityNameForUpload, externalIdForUpload, extractActivityIdFromUploadError, mapStravaUploadStatus } from "./uploads";

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

  it("maps ready text to uploaded", () => {
    expect(mapStravaUploadStatus({ id: "1", status: "Your activity is ready." })).toBe("uploaded");
  });

  it("maps status errors to failed", () => {
    expect(mapStravaUploadStatus({ id: "1", status: "There was an error processing your activity." })).toBe("failed");
  });
});

describe("externalIdForUpload", () => {
  it("uses the uploaded filename as Strava external_id", () => {
    expect(externalIdForUpload("Cycle-20260312-1946-12048.fit")).toBe("Cycle-20260312-1946-12048.fit");
    expect(externalIdForUpload("/tmp/Cycle-20260312-1946-12048.fit")).toBe("Cycle-20260312-1946-12048.fit");
    expect(externalIdForUpload(" Cycle-20260312-1946-12048.fit ")).toBe("Cycle-20260312-1946-12048.fit");
  });
});

describe("activityNameForUpload", () => {
  it("uses the prefix before the first dash as the Strava activity name", () => {
    expect(activityNameForUpload("Cycle-20260312-1946-12048.fit")).toBe("Cycle");
    expect(activityNameForUpload("Run-20260312-1946-12048.tcx")).toBe("Run");
  });

  it("falls back to the filename without extension when there is no dash", () => {
    expect(activityNameForUpload("MorningRide.fit")).toBe("MorningRide");
  });
});

describe("extractActivityIdFromUploadError", () => {
  it("extracts the linked Strava activity id from duplicate upload errors", () => {
    expect(
      extractActivityIdFromUploadError(
        "Cycle-20250801-1655-54126.fit duplicate of <a href='/activities/18106372042' target='_blank'>Cycle</a>"
      )
    ).toBe("18106372042");
  });

  it("returns null when the error does not include an activity link", () => {
    expect(extractActivityIdFromUploadError("There was an error processing your activity.")).toBeNull();
    expect(extractActivityIdFromUploadError(null)).toBeNull();
  });
});
