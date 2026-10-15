import "server-only";
import { createPublicClient, http } from "viem";
import { mainnet, sepolia } from "viem/chains";
export const sepoliaClient = createPublicClient({
  chain: sepolia,
  transport: http(
    process.env.SEPOLIA_RPC_URL ||
      "https://ethereum-sepolia-rpc.publicnode.com",
    { timeout: 12000, retryCount: 1 },
  ),
});
export const mainnetClient = createPublicClient({
  chain: mainnet,
  transport: http(
    process.env.MAINNET_RPC_URL || "https://ethereum-rpc.publicnode.com",
    { timeout: 12000, retryCount: 1 },
  ),
});
