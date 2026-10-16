import { CONTRACT } from "@/lib/config";
import { classNftAbi } from "@/lib/contracts/classNftAbi";
import { sepoliaClient } from "@/lib/server/clients";
import { failure, PublicError } from "@/lib/server/response";

export async function GET(request: Request) {
  try {
    const cursor = new URL(request.url).searchParams.get("fromBlock");
    if (cursor && !/^\d{1,16}$/.test(cursor))
      throw new PublicError("Invalid block cursor.");
    const head = await sepoliaClient.getBlockNumber({ cacheTime: 0 });
    const from = cursor ? BigInt(cursor) : head > 10n ? head - 10n : 0n;
    if (from > head + 1n)
      throw new PublicError("Block cursor is ahead of the chain.");
    const to = from + 199n < head ? from + 199n : head;
    const logs =
      from <= head
        ? await sepoliaClient.getLogs({
            address: CONTRACT,
            event: classNftAbi.find(
              (item) => item.type === "event" && item.name === "Minted",
            )!,
            fromBlock: from,
            toBlock: to,
            strict: true,
          })
        : [];
    return Response.json(
      {
        nextBlock: (to + 1n).toString(),
        head: head.toString(),
        events: logs.map((log) => ({
          id: `${log.transactionHash}:${log.logIndex}`,
          transactionHash: log.transactionHash,
          blockNumber: log.blockNumber.toString(),
          address: log.args.to,
          tokenId: log.args.tokenId!.toString(),
          uri: log.args.uri,
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
