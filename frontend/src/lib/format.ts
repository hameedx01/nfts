export const usd = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n > 0 && n < 0.01 ? 4 : 2,
  }).format(n);
export const shortAddress = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
export function age(seconds: number) {
  if (seconds < 60) return `${Math.max(0, Math.floor(seconds))}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h`;
}
export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      data.error || "The request could not be completed. Please try again.",
    );
  return data;
}
