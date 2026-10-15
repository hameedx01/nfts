export function describeMintError(error: unknown): string {
  const seen = new Set<object>();
  let current: unknown = error;
  const names = new Set<string>();
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const item = current as { name?: string; code?: unknown; cause?: unknown };
    if (item.code === 4001 || item.name === "UserRejectedRequestError") {
      return "You declined the wallet request. Your work is still here when you’re ready.";
    }
    if (item.name) names.add(item.name);
    current = item.cause;
  }
  if (names.has("InsufficientFundsError")) {
    return "Your wallet needs more Sepolia test ETH for the network fee.";
  }
  if (names.has("HttpRequestError") || names.has("RpcRequestError")) {
    return "Could not reach Sepolia. Please try again.";
  }
  // API messages are ordinary Errors. Preserve them, even when they contain
  // words like 'rejected', 'denied' or 'HTTP'; those do not identify a wallet error.
  const message = error instanceof Error ? error.message : "";
  return (
    message.split("Request Arguments:")[0].split("Details:")[0].slice(0, 350) ||
    "The request could not be completed. Please try again."
  );
}
