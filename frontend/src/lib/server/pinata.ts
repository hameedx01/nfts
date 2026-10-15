import "server-only";
import { PublicError } from "./response";
export async function pin(file: File): Promise<string> {
  const form = new FormData();
  form.set("file", file);
  form.set("network", "public");
  const response = await fetch("https://uploads.pinata.cloud/v3/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.PINATA_JWT}` },
    body: form,
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok)
    throw new PublicError(
      "Pinata could not store the file. Please try again.",
      502,
    );
  const data = await response.json();
  const cid = data?.data?.cid;
  if (typeof cid !== "string" || !/^[a-zA-Z0-9]{20,120}$/.test(cid))
    throw new PublicError("Pinata returned an unexpected response.", 502);
  return `ipfs://${cid}`;
}
