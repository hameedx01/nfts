import "server-only";
import { sepoliaClient } from "./clients";
import { classNftAbi } from "@/lib/contracts/classNftAbi";
import { CONTRACT } from "@/lib/config";
import { ipfsProxyUrl } from "@/lib/ipfs";
import { fetchIpfsMetadata } from "@/lib/ipfs-content";
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
    const metadata = await fetchIpfsMetadata(
      uri,
      process.env.PINATA_GATEWAY_HOST,
    );
    if (typeof metadata.name === "string")
      nft.name = metadata.name.slice(0, 120);
    if (typeof metadata.description === "string")
      nft.description = metadata.description.slice(0, 1000);
    if (typeof metadata.image === "string")
      nft.image = ipfsProxyUrl(metadata.image, "file");
  } catch {
    nft.metadataError = true;
  }
  return nft;
}
