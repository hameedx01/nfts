import { NextResponse } from "next/server";
import { ipfsPath } from "@/lib/ipfs";
import { fetchIpfsContent, fetchIpfsMetadata } from "@/lib/ipfs-content";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const cid = params.get("cid");
  const path = params.get("path");
  const type = params.get("type") ?? "metadata";
  const uri = `ipfs://${cid}${path ? `/${path}` : ""}`;
  try {
    if (
      !cid ||
      !/^[a-zA-Z0-9]{20,120}$/.test(cid) ||
      !["metadata", "file"].includes(type)
    )
      throw new Error();
    ipfsPath(uri);
  } catch {
    return NextResponse.json(
      { error: "Invalid IPFS request" },
      { status: 400 },
    );
  }
  const gateway = process.env.PINATA_GATEWAY_HOST;
  if (!gateway)
    return NextResponse.json(
      { error: "PINATA_GATEWAY_HOST is not configured" },
      { status: 500 },
    );
  try {
    if (type === "file") {
      const { bytes, contentType } = await fetchIpfsContent(
        uri,
        gateway,
        "file",
      );
      return new Response(bytes, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=3600",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    return NextResponse.json(await fetchIpfsMetadata(uri, gateway), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to retrieve IPFS content" },
      { status: 502 },
    );
  }
}
