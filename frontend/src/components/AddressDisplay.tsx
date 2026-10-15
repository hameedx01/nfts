"use client";
import { useEnsIdentity } from "@/hooks/useEnsIdentity";
import { shortAddress } from "@/lib/format";
export function AddressDisplay({ address }: { address: string }) {
  const { data } = useEnsIdentity(address);
  return <span title={address}>{data?.name || shortAddress(address)}</span>;
}
