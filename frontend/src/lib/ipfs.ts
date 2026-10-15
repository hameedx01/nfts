import { GATEWAY } from "./config";
export function ipfsUrl(uri: string): string {
  return GATEWAY.replace(/\/$/, "") + "/" + ipfsPath(uri);
}
export function ipfsPath(uri: string): string {
  if (
    !/^ipfs:\/\/[a-zA-Z0-9]{20,120}(\/[^?#\\]*)?$/.test(uri) ||
    uri.includes("..") ||
    /[%\s\u0000-\u001f]/.test(uri)
  )
    throw new Error("Invalid IPFS URI");
  return uri.slice(7);
}
export function ipfsProxyUrl(
  uri: string,
  type: "metadata" | "file" = "metadata",
) {
  const [cid, ...path] = ipfsPath(uri).split("/");
  const params = new URLSearchParams({ cid, type });
  if (path.length) params.set("path", path.join("/"));
  return `/api/ipfs?${params}`;
}
