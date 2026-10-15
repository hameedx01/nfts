import { GATEWAY } from "./config";
export function ipfsUrl(uri: string): string {
  if (
    !/^ipfs:\/\/[a-zA-Z0-9]{20,120}(\/[^?#\\]*)?$/.test(uri) ||
    uri.includes("..")
  )
    throw new Error("Invalid IPFS URI");
  return GATEWAY.replace(/\/$/, "") + "/" + uri.slice(7);
}
