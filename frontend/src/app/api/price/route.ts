import { formatUnits, getAddress } from "viem";
import { sepoliaClient } from "@/lib/server/clients";
import { chainlinkAbi } from "@/lib/contracts/chainlinkAbi";
import { FEED_MAX_AGE } from "@/lib/config";
import { failure, PublicError } from "@/lib/server/response";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const address = getAddress(
      (
        process.env.CHAINLINK_ETH_USD_FEED_ADDRESS ||
        "0x694AA1769357215DE4FAC081bf1f309aDC325306"
      ).toLowerCase(),
    );
    const [decimals, round] = await Promise.all([
      sepoliaClient.readContract({
        address,
        abi: chainlinkAbi,
        functionName: "decimals",
      }),
      sepoliaClient.readContract({
        address,
        abi: chainlinkAbi,
        functionName: "latestRoundData",
      }),
    ]);
    const [roundId, answer, , updatedAt] = round;
    const now = Math.floor(Date.now() / 1000);
    if (answer <= 0n || updatedAt === 0n || updatedAt > BigInt(now + 60))
      throw new PublicError("The oracle has not returned a valid price.", 503);
    return Response.json(
      {
        price: Number(formatUnits(answer, decimals)),
        roundId: roundId.toString(),
        updatedAt: Number(updatedAt),
        fetchedAt: now,
        stale: now - Number(updatedAt) > FEED_MAX_AGE,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
