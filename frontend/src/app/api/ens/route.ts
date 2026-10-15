import { isAddress, getAddress } from "viem";
import { normalize } from "viem/ens";
import { mainnetClient } from "@/lib/server/clients";
import { failure, PublicError } from "@/lib/server/response";
export async function GET(request: Request) {
  try {
    const value = new URL(request.url).searchParams.get("q")?.trim() || "";
    if (value.length > 255) throw new PublicError("That name is too long.");
    let address: `0x${string}` | null = null;
    let name: string | null = null;
    if (isAddress(value, { strict: false })) {
      address = getAddress(value.toLowerCase());
      const reverse = await mainnetClient.getEnsName({ address });
      if (reverse) {
        const forward = await mainnetClient.getEnsAddress({
          name: normalize(reverse),
        });
        if (forward?.toLowerCase() === address.toLowerCase()) name = reverse;
      }
    } else {
      if (!value.toLowerCase().endsWith(".eth"))
        throw new PublicError("Enter a .eth name or an Ethereum address.");
      try {
        name = normalize(value);
      } catch {
        throw new PublicError("That ENS name is not valid.");
      }
      address = await mainnetClient.getEnsAddress({ name });
      if (!address)
        throw new PublicError("This name has no Ethereum address record.", 404);
    }
    return Response.json(
      { name, address },
      {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
        },
      },
    );
  } catch (error) {
    return failure(error);
  }
}
