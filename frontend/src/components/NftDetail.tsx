"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { api } from "@/lib/format";
import { ipfsProxyUrl } from "@/lib/ipfs";
import { CONTRACT, EXPLORER } from "@/lib/config";
import type { Nft } from "@/types/nft";
import { Artwork } from "./NftCard";
import { AddressDisplay } from "./AddressDisplay";
import { useEthPrice } from "@/hooks/useEthPrice";
export function NftDetail({ id }: { id: string }) {
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["nft", id],
    queryFn: () => api<Nft>(`/api/nfts?id=${encodeURIComponent(id)}`),
    refetchInterval: 60000,
  });
  const price = useEthPrice();
  if (isPending)
    return (
      <div className="empty-state" role="status">
        <span className="spinner" />
        <p>Reading this edition from the chain…</p>
      </div>
    );
  if (error || !data)
    return (
      <div className="empty-state">
        <h2>This edition couldn’t be loaded.</h2>
        <p>{error?.message}</p>
        <button className="button" onClick={() => refetch()}>
          Try again
        </button>
        <Link className="text-link" href="/gallery">
          Back to collection
        </Link>
      </div>
    );
  let metadataUrl: string | null = null;
  try {
    metadataUrl = ipfsProxyUrl(data.uri);
  } catch {}
  return (
    <section className="detail-section">
      <Link className="text-link" href="/gallery">
        <ArrowLeft size={16} />
        Back to the collection
      </Link>
      <div className="detail-grid">
        <div className="detail-art">
          <Artwork nft={data} />
        </div>
        <div className="detail-copy">
          <span className="eyebrow">
            EDITION {id.padStart(3, "0")} / ONE OF ONE
          </span>
          <h1>{data.name}</h1>
          <p>{data.description || "An original, made on Edition."}</p>
          <div className="detail-owner">
            <span className="mini-label">CURRENTLY COLLECTED BY</span>
            <a
              href={`${EXPLORER}/address/${data.owner}`}
              target="_blank"
              rel="noreferrer"
            >
              <AddressDisplay address={data.owner} />
              <ArrowUpRight size={16} />
            </a>
          </div>
          <div className="mint-summary">
            <div>
              <span>Mint payment</span>
              <strong>
                0 ETH /{" "}
                {price.data && !price.data.stale && !price.isError
                  ? "$0.00"
                  : "USD unavailable"}
              </strong>
            </div>
            <div>
              <span>Network</span>
              <strong>Ethereum Sepolia</strong>
            </div>
            <div>
              <span>Storage</span>
              <strong>IPFS</strong>
            </div>
          </div>
          <p className="fine-print">
            Minting is free; network fees are separate. This is not an appraisal
            or resale price.
          </p>
          {data.metadataError && (
            <p className="error-notice">
              Metadata is temporarily unavailable. The NFT still exists onchain.
            </p>
          )}
          <div className="detail-links">
            {metadataUrl && (
              <a
                className="button outline"
                href={metadataUrl}
                target="_blank"
                rel="noreferrer"
              >
                View IPFS metadata <ArrowUpRight size={16} />
              </a>
            )}
            <a
              className="text-link"
              href={`${EXPLORER}/nft/${CONTRACT}/${id}`}
              target="_blank"
              rel="noreferrer"
            >
              View on Etherscan <ArrowUpRight size={16} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
