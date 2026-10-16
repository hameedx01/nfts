"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Plus, RefreshCw } from "lucide-react";
import { useNfts } from "@/hooks/useNfts";
import { useEthPrice } from "@/hooks/useEthPrice";
import { NftCard } from "./NftCard";
export function Gallery({ preview = false }: { preview?: boolean }) {
  const [page, setPage] = useState(0);
  const { data, isPending, error, refetch, isFetching } = useNfts(page);
  const price = useEthPrice();
  return (
    <section className={`gallery-section ${preview ? "gallery-preview" : ""}`}>
      <div className="section-heading">
        <div>
          <span className="eyebrow">THE PUBLIC COLLECTION</span>
          <h2>
            {preview ? "Fresh off the press." : "Made here. Kept forever."}
          </h2>
        </div>
        {preview ? (
          <Link className="text-link" href="/gallery">
            Explore the collection <ArrowUpRightIcon />
          </Link>
        ) : (
          <button
            className="button outline small"
            disabled={isFetching}
            onClick={() => refetch()}
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        )}
      </div>
      {!preview && (
        <p className="section-intro">
          Original work, shared onchain. Every edition belongs to a wallet,
          every image lives on IPFS.
        </p>
      )}
      {error && data && (
        <p className="error-notice" role="status">
          Refresh interrupted. Showing the last loaded collection and retrying
          automatically.
        </p>
      )}
      {isPending ? (
        <div className="gallery-grid" aria-label="Loading collection">
          {[0, 1, 2].map((n) => (
            <div className="skeleton-card" key={n}>
              <div className="skeleton-art" />
              <div className="skeleton-line" />
              <div className="skeleton-line short" />
            </div>
          ))}
        </div>
      ) : error && !data ? (
        <div className="empty-state">
          <span className="eyebrow">COLLECTION UNAVAILABLE</span>
          <h3>We couldn’t reach the chain.</h3>
          <p>
            Your NFTs are safe onchain. We’re retrying automatically; you can
            also try again now.
          </p>
          <button className="button outline" onClick={() => refetch()}>
            Try again <RefreshCw size={15} />
          </button>
        </div>
      ) : data?.items.length ? (
        <>
          <div className="gallery-grid">
            {(preview ? data.items.slice(0, 3) : data.items).map((nft) => (
              <NftCard
                key={nft.id}
                nft={nft}
                priceAvailable={Boolean(
                  price.data && !price.data.stale && !price.isError,
                )}
              />
            ))}
          </div>
          {!preview && (
            <div className="pagination">
              <span>{data.total} editions in the collection</span>
              <div>
                <button
                  className="icon-button"
                  aria-label="Previous page"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ArrowLeft size={18} />
                </button>
                <span>Page {page + 1}</span>
                <button
                  className="icon-button"
                  aria-label="Next page"
                  disabled={!data.hasMore}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="empty-state">
          <div className="empty-stamp">
            <Plus size={28} strokeWidth={1} />
          </div>
          <h3>The first page is yours.</h3>
          <p>
            No editions have been minted yet. Give this collection its first
            piece.
          </p>
          <Link href="/#create" className="text-link">
            Create the first edition <ArrowRight size={16} />
          </Link>
        </div>
      )}
    </section>
  );
}
function ArrowUpRightIcon() {
  return <ArrowRight size={16} className="diagonal-arrow" />;
}
