import { describe, expect, it } from "vitest";
import { toDateInputValue } from "./DashboardRoute";

describe("DashboardRoute date helpers", () => {
  it("formats dates for native date inputs", () => {
    expect(toDateInputValue(new Date("2026-04-05T18:30:00.000Z"))).toBe("2026-04-05");
  });
});
