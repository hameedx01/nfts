import "server-only";
import { PublicError } from "./response";
import { pinataErrorMessage } from "../pinata-errors";
export async function pin(file: File): Promise<string> {
  const form = new FormData();
  form.set("file", file);
  form.set("network", "public");
  const response = await fetch("https://uploads.pinata.cloud/v3/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.PINATA_JWT?.trim()}` },
    body: form,
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    console.error("Pinata upload rejected", {
      status: response.status,
      stage: file.type === "application/json" ? "metadata" : "image",
    });
    throw new PublicError(pinataErrorMessage(response.status), 502);
  }
  const data = await response.json();
  const cid = data?.data?.cid;
  if (typeof cid !== "string" || !/^[a-zA-Z0-9]{20,120}$/.test(cid))
    throw new PublicError("Pinata returned an unexpected response.", 502);
  return `ipfs://${cid}`;
}
