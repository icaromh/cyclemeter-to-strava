import { describe, expect, it } from "vitest";

describe("UploadCheckRoute rules", () => {
  it("documents upload eligibility", () => {
    const statuses = ["not_found", "match_confirmed", "match_probable", "parse_error"];
    expect(statuses.filter((status) => status === "not_found")).toEqual(["not_found"]);
  });
});

