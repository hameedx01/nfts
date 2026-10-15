"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/format";
import type { Price } from "@/types/nft";
export function useEthPrice() {
  return useQuery({
    queryKey: ["price"],
    queryFn: () => api<Price>("/api/price"),
    refetchInterval: 30000,
    refetchOnWindowFocus: "always",
  });
}
