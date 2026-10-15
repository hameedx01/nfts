import "server-only";
import { sepoliaClient } from "./clients";
import { classNftAbi } from "@/lib/contracts/classNftAbi";
import { CONTRACT } from "@/lib/config";
import { ipfsUrl } from "@/lib/ipfs";
import type { Nft } from "@/types/nft";
export async function readNft(id: bigint): Promise<Nft> {
  const [owner, uri] = await Promise.all([
    sepoliaClient.readContract({
      address: CONTRACT,
      abi: classNftAbi,
      functionName: "ownerOf",
      args: [id],
    }),
    sepoliaClient.readContract({
      address: CONTRACT,
      abi: classNftAbi,
      functionName: "tokenURI",
      args: [id],
    }),
  ]);
  const nft: Nft = {
    id: id.toString(),
    owner,
    uri,
    name: `Edition #${id}`,
    description: "",
    image: null,
  };
  try {
    const response = await fetch(ipfsUrl(uri), {
      signal: AbortSignal.timeout(8000),
      redirect: "error",
      next: { revalidate: 300 },
    });
    if (!response.ok || Number(response.headers.get("content-length")) > 262144)
      throw new Error("Metadata unavailable");
    const reader = response.body!.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 262144) {
        await reader.cancel();
        throw new Error("Metadata too large");
      }
      chunks.push(value);
    }
    const metadata = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (typeof metadata.name === "string")
      nft.name = metadata.name.slice(0, 120);
    if (typeof metadata.description === "string")
      nft.description = metadata.description.slice(0, 1000);
    if (typeof metadata.image === "string") nft.image = ipfsUrl(metadata.image);
  } catch {
    nft.metadataError = true;
  }
  return nft;
}
