import { z } from "zod";
import { describe, expect, it, vi } from "vitest";
import { HttpError, toErrorResponse } from "./errors";

describe("toErrorResponse", () => {
  it("formats HttpError without undefined details", () => {
    expect(toErrorResponse(new HttpError(401, "unauthorized", "Authentication is required"))).toEqual({
      status: 401,
      body: {
        error: {
          code: "unauthorized",
          message: "Authentication is required"
        }
      }
    });
  });

  it("formats validation errors", () => {
    const parsed = z.object({ id: z.string().uuid() }).safeParse({ id: "bad" });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    const response = toErrorResponse(parsed.error);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("validation_error");
    expect(response.body.error.details).toBeDefined();
  });

  it("hides unknown error details", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(toErrorResponse(new Error("secret"))).toEqual({
      status: 500,
      body: {
        error: {
          code: "internal_error",
          message: "Unexpected server error"
        }
      }
    });
    errorSpy.mockRestore();
  });
});
