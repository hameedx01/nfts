import "server-only";
import { getAddress } from "viem";
import { sepoliaClient } from "./clients";
import { classNftAbi } from "@/lib/contracts/classNftAbi";
import { CONTRACT } from "@/lib/config";
import { ipfsProxyUrl } from "@/lib/ipfs";
import { fetchIpfsMetadata } from "@/lib/ipfs-content";
import type { Nft } from "@/types/nft";
export async function readNfts(ids: bigint[]): Promise<Nft[]> {
  if (!ids.length) return [];
  // One Multicall eth_call replaces up to 18 concurrent RPC requests per page.
  const values = await sepoliaClient.multicall({
    allowFailure: false,
    contracts: ids.flatMap((id) => [
      {
        address: CONTRACT,
        abi: classNftAbi,
        functionName: "ownerOf" as const,
        args: [id] as const,
      },
      {
        address: CONTRACT,
        abi: classNftAbi,
        functionName: "tokenURI" as const,
        args: [id] as const,
      },
    ]),
  });
  const metadata = new Map<string, ReturnType<typeof fetchIpfsMetadata>>();
  return Promise.all(
    ids.map((id, index) =>
      hydrateNft(id, values[index * 2], values[index * 2 + 1], metadata),
    ),
  );
}
export async function readNft(id: bigint): Promise<Nft> {
  return (await readNfts([id]))[0];
}
async function hydrateNft(
  id: bigint,
  owner: string,
  uri: string,
  cache: Map<string, ReturnType<typeof fetchIpfsMetadata>>,
): Promise<Nft> {
  const nft: Nft = {
    id: id.toString(),
    owner: getAddress(owner),
    uri,
    name: `Edition #${id}`,
    description: "",
    image: null,
  };
  try {
    let pending = cache.get(uri);
    if (!pending) {
      pending = fetchIpfsMetadata(uri, process.env.PINATA_GATEWAY_HOST);
      cache.set(uri, pending);
    }
    const metadata = await pending;
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
