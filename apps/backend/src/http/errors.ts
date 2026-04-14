import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
  }
}

export function toErrorResponse(error: unknown) {
  if (error instanceof HttpError) {
    const body = {
      error: {
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details })
      }
    };

    return {
      status: error.status,
      body
    };
  }

  if (error instanceof ZodError) {
    return {
      status: 400,
      body: {
        error: {
          code: "validation_error",
          message: "Invalid request",
          details: error.flatten()
        }
      }
    };
  }

  console.error(error);
  return {
    status: 500,
    body: {
      error: {
        code: "internal_error",
        message: "Unexpected server error"
      }
    }
  };
}
