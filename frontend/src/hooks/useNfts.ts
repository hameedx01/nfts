"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/format";
import type { Nft } from "@/types/nft";
export function useNfts(page = 0) {
  return useQuery({
    queryKey: ["nfts", page],
    queryFn: () =>
      api<{ items: Nft[]; total: string; hasMore: boolean }>(
        `/api/nfts?page=${page}`,
      ),
    refetchInterval: 15000,
    staleTime: 10000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
  });
}
