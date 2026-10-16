export function describeSmartAccountError(error: unknown): string {
  const seen = new Set<object>();
  let current = error;
  let studioMessage: string | undefined;
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const item = current as {
      code?: unknown;
      name?: string;
      details?: unknown;
      cause?: unknown;
    };
    if (item.code === 4001 || item.name === "UserRejectedRequestError")
      return "You declined the wallet request. Your uploaded artwork is still available.";
    if (typeof item.details === "string" && item.details.startsWith("Studio: "))
      studioMessage = item.details.slice(8);
    current = item.cause;
  }
  if (studioMessage) return studioMessage;
  const message =
    error instanceof Error ? error.message : "Smart-account request failed.";
  // Never fill the alert with encoded calls, request URLs, or signed operation data.
  return (
    message
      .split(/Request (?:body|Arguments):|URL:|Details:/)[0]
      .trim()
      .slice(0, 350) || "The smart-account request failed. Please try again."
  );
}
