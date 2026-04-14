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
    return {
      status: error.status,
      body: {
        error: {
          code: error.code,
          message: error.message,
          details: error.details
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

