import { ipfsPath } from "./ipfs";

export async function fetchIpfsContent(
  uri: string,
  host: string | undefined,
  type: "metadata" | "file",
) {
  const path = ipfsPath(uri);
  if (!host) throw new Error("PINATA_GATEWAY_HOST is not configured");
  const gateway = new URL(
    host.includes("://") ? host : `https://${host.trim()}`,
  );
  if (
    gateway.protocol !== "https:" ||
    gateway.username ||
    gateway.password ||
    gateway.port ||
    gateway.search ||
    gateway.hash ||
    !["/", "/ipfs", "/ipfs/"].includes(gateway.pathname)
  ) {
    throw new Error("Invalid PINATA_GATEWAY_HOST configuration");
  }
  const response = await fetch(`${gateway.origin}/ipfs/${path}`, {
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`Gateway returned ${response.status}`);
  }
  const contentType =
    response.headers.get("content-type") ?? "application/octet-stream";
  const mime = contentType.split(";")[0].trim().toLowerCase();
  // Only passive image formats may be served from our own origin.
  if (
    type === "file" &&
    ![
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/gif",
      "image/avif",
    ].includes(mime)
  ) {
    await response.body?.cancel();
    throw new Error("Gateway did not return a supported image");
  }
  if (type === "metadata" && mime !== "application/json") {
    await response.body?.cancel();
    throw new Error("Gateway did not return JSON metadata");
  }
  const limit = type === "metadata" ? 262144 : 10 * 1024 * 1024;
  if (Number(response.headers.get("content-length")) > limit) {
    await response.body?.cancel();
    throw new Error("IPFS content is too large");
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Gateway returned an empty response");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) {
        await reader.cancel();
        throw new Error("IPFS content is too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return { bytes, contentType };
}

export async function fetchIpfsMetadata(uri: string, host: string | undefined) {
  const { bytes } = await fetchIpfsContent(uri, host, "metadata");
  const metadata = JSON.parse(new TextDecoder().decode(bytes));
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata))
    throw new Error("Invalid IPFS metadata");
  return metadata as Record<string, unknown>;
}
