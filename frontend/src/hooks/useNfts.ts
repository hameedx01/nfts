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
    refetchInterval: 60000,
  });
}
