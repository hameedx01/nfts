export function uploadMessage(
  address: string,
  digest: string,
  timestamp: string,
) {
  return `Edition Studio — authorize one IPFS upload\nWallet: ${address.toLowerCase()}\nContent SHA-256: ${digest}\nTimestamp: ${timestamp}\nThis signature does not authorize a transaction or transfer.`;
}
export async function contentDigest(
  file: ArrayBuffer,
  name: string,
  description: string,
) {
  const text = new TextEncoder().encode(JSON.stringify({ name, description }));
  const bytes = new Uint8Array(file.byteLength + text.byteLength);
  bytes.set(new Uint8Array(file));
  bytes.set(text, file.byteLength);
  return Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}
export function imageType(bytes: Uint8Array): string | null {
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return "image/jpeg";
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b))
    return "image/png";
  if (
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  )
    return "image/webp";
  return null;
}
