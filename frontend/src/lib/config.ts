import { getAddress } from "viem";
export const CONTRACT = getAddress(
  (
    process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS ||
    "0x3fb98718010365fc227eb09e1af85988991b2ad1"
  ).toLowerCase(),
);
export const EXPLORER = "https://sepolia.etherscan.io";
export const MAX_FILE_SIZE = 3 * 1024 * 1024;
export const FEED_MAX_AGE = 4 * 60 * 60;
export const GATEWAY =
  process.env.NEXT_PUBLIC_IPFS_GATEWAY_URL || "https://ipfs.io/ipfs/";
