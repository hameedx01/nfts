"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/format";
import type { Identity } from "@/types/nft";
export function useEnsIdentity(address?: string) {
  return useQuery({
    queryKey: ["ens", address?.toLowerCase()],
    queryFn: () => api<Identity>(`/api/ens?q=${encodeURIComponent(address!)}`),
    enabled: Boolean(address),
    staleTime: 300000,
    retry: false,
  });
}
