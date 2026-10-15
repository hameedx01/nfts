import "server-only";
export class PublicError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function failure(error: unknown) {
  return Response.json(
    {
      error:
        error instanceof PublicError
          ? error.message
          : "The service is temporarily unavailable. Please try again.",
    },
    { status: error instanceof PublicError ? error.status : 502 },
  );
}
