import { readNft } from "@/lib/server/nfts";
import { sepoliaClient } from "@/lib/server/clients";
import { classNftAbi } from "@/lib/contracts/classNftAbi";
import { CONTRACT } from "@/lib/config";
import { failure, PublicError } from "@/lib/server/response";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const total = await sepoliaClient.readContract({
      address: CONTRACT,
      abi: classNftAbi,
      functionName: "totalMinted",
    });
    const id = params.get("id");
    if (id !== null) {
      if (!/^\d{1,78}$/.test(id) || BigInt(id) >= total)
        throw new PublicError("This edition does not exist.", 404);
      return Response.json(await readNft(BigInt(id)));
    }
    const page = Number(params.get("page") || 0);
    if (!Number.isSafeInteger(page) || page < 0 || page > 1000000)
      throw new PublicError("Invalid page.");
    const start = total - 1n - BigInt(page * 9);
    const ids = Array.from({ length: 9 }, (_, i) => start - BigInt(i)).filter(
      (id) => id >= 0n,
    );
    const items = await Promise.all(ids.map(readNft));
    return Response.json(
      { items, total: total.toString(), hasMore: start >= 9n },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
