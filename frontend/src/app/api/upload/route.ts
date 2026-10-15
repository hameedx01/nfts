import { isAddress, verifyMessage, type Hex } from "viem";
import { MAX_FILE_SIZE } from "@/lib/config";
import { contentDigest, imageType, uploadMessage } from "@/lib/upload";
import { pin } from "@/lib/server/pinata";
import { consumeUpload } from "@/lib/server/limits";
import { failure, PublicError } from "@/lib/server/response";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    if (!process.env.PINATA_JWT)
      throw new PublicError(
        "Uploads are not configured yet. The studio owner needs to add the Pinata server key.",
        503,
      );
    if (request.headers.get("origin") !== new URL(request.url).origin)
      throw new PublicError("Upload from the studio website.", 403);
    if (
      Number(request.headers.get("content-length") || 0) >
      MAX_FILE_SIZE + 65536
    )
      throw new PublicError("Choose an image smaller than 3 MB.", 413);
    const form = await request.formData();
    const file = form.get("file");
    const name = String(form.get("name") || "").trim();
    const description = String(form.get("description") || "").trim();
    const address = String(form.get("address") || "");
    const timestamp = String(form.get("timestamp") || "");
    const signature = String(form.get("signature") || "");
    if (!(file instanceof File) || file.size === 0 || file.size > MAX_FILE_SIZE)
      throw new PublicError("Choose an image smaller than 3 MB.");
    if (!name || name.length > 80 || description.length > 500)
      throw new PublicError(
        "Use a title up to 80 characters and a description up to 500 characters.",
      );
    if (
      !isAddress(address) ||
      !/^\d{13}$/.test(timestamp) ||
      Math.abs(Date.now() - Number(timestamp)) > 300000 ||
      !/^0x[0-9a-fA-F]{130}$/.test(signature)
    )
      throw new PublicError(
        "Upload authorization expired or is invalid. Please sign again.",
        401,
      );
    const buffer = await file.arrayBuffer();
    const type = imageType(new Uint8Array(buffer));
    if (!type || file.type !== type)
      throw new PublicError("Use a valid PNG, JPEG, or WebP image.");
    const digest = await contentDigest(buffer, name, description);
    if (
      !(await verifyMessage({
        address,
        message: uploadMessage(address, digest, timestamp),
        signature: signature as Hex,
      }))
    )
      throw new PublicError("The upload signature could not be verified.", 401);
    await consumeUpload(address, digest, timestamp);
    const imageUri = await pin(
      new File(
        [buffer],
        "artwork." + (type === "image/jpeg" ? "jpg" : type.split("/")[1]),
        { type },
      ),
    );
    const uri = await pin(
      new File(
        [JSON.stringify({ name, description, image: imageUri })],
        "metadata.json",
        { type: "application/json" },
      ),
    );
    return Response.json({ uri, imageUri });
  } catch (error) {
    return failure(error);
  }
}
