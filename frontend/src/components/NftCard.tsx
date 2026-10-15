"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, ImageOff } from "lucide-react";
import { AddressDisplay } from "./AddressDisplay";
import type { Nft } from "@/types/nft";
export function Artwork({ nft }: { nft: Nft }) {
  const [failed, setFailed] = useState(false);
  return nft.image && !failed ? (
    <img
      src={nft.image}
      alt={nft.name}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  ) : (
    <div className="art-unavailable">
      <ImageOff size={28} />
      <span>
        {nft.metadataError || failed
          ? "Artwork temporarily unavailable"
          : "No image in metadata"}
      </span>
    </div>
  );
}
export function NftCard({
  nft,
  priceAvailable,
}: {
  nft: Nft;
  priceAvailable: boolean;
}) {
  return (
    <article className="nft-card">
      <Link href={`/nft/${nft.id}`} className="nft-art">
        <Artwork nft={nft} />
        <span className="edition-number">ED. {nft.id.padStart(3, "0")}</span>
        <span className="art-arrow">
          <ArrowUpRight size={20} />
        </span>
      </Link>
      <div className="nft-heading">
        <Link href={`/nft/${nft.id}`}>
          <h3>{nft.name}</h3>
        </Link>
        <span className="mini-label">1 OF 1</span>
      </div>
      <div className="nft-owner">
        Collected by <AddressDisplay address={nft.owner} />
      </div>
      <div className="nft-cost">
        <span>Mint payment</span>
        <span>
          0 ETH{" "}
          <span className="muted">
            / {priceAvailable ? "$0.00" : "USD unavailable"}
          </span>
        </span>
      </div>
    </article>
  );
}
