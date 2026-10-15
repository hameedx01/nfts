import "server-only";
import { PublicError } from "./response";
const local = new Map<string, { count: number; until: number }>();
async function redis(command: (string | number)[]) {
  const response = await fetch(process.env.UPSTASH_REDIS_REST_URL!, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    signal: AbortSignal.timeout(5000),
    cache: "no-store",
  });
  if (!response.ok)
    throw new PublicError(
      "Upload protection is unavailable. Try again shortly.",
      503,
    );
  const data = await response.json();
  if (data.error)
    throw new PublicError("Upload protection is unavailable.", 503);
  return data.result;
}
export async function consumeUpload(
  address: string,
  digest: string,
  timestamp: string,
) {
  const bucket = Math.floor(Date.now() / 3600000);
  const key = `edition:limit:${address.toLowerCase()}:${bucket}`;
  const replay = `edition:used:${address.toLowerCase()}:${digest}:${timestamp}`;
  if (
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    const count = await redis([
      "EVAL",
      "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],3600) end; return n",
      1,
      key,
    ]);
    if (count > 10)
      throw new PublicError("Upload limit reached. Try again in an hour.", 429);
    if ((await redis(["SET", replay, "1", "NX", "EX", 600])) !== "OK")
      throw new PublicError(
        "This upload authorization was already used. Sign again.",
        409,
      );
  } else {
    if (process.env.VERCEL)
      throw new PublicError(
        "Uploads need the server upload-protection settings. Ask the studio owner to complete setup.",
        503,
      );
    const now = Date.now();
    for (const [key, item] of local) if (item.until < now) local.delete(key);
    const entry = local.get(key) || { count: 0, until: now + 3600000 };
    if (entry.count >= 10)
      throw new PublicError("Upload limit reached. Try again in an hour.", 429);
    if (local.has(replay))
      throw new PublicError(
        "This upload authorization was already used. Sign again.",
        409,
      );
    entry.count++;
    local.set(key, entry);
    local.set(replay, { count: 1, until: now + 600000 });
  }
}
