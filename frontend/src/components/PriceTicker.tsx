"use client";
import { useEffect, useState } from "react";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import { useEthPrice } from "@/hooks/useEthPrice";
import { age, usd } from "@/lib/format";
import { FEED_MAX_AGE } from "@/lib/config";
export function PriceTicker() {
  const { data, isPending, isError, isFetching, refetch } = useEthPrice();
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now() / 1000);
    const timer = setInterval(() => setNow(Date.now() / 1000), 1000);
    return () => clearInterval(timer);
  }, []);
  const stale = data && (data.stale || now - data.updatedAt > FEED_MAX_AGE);
  return (
    <div className="price-strip">
      <div className="price-label">
        <span className={`status-dot ${isError || stale ? "warning" : ""}`} />
        <span>ETH / USD</span>
        <strong>
          {data ? usd(data.price) : isPending ? "Reading feed…" : "Unavailable"}
        </strong>
      </div>
      <div className="price-meta">
        {data ? (
          <>
            <span>
              {isError
                ? "Connection interrupted"
                : stale
                  ? "Oracle data is stale"
                  : `Oracle updated ${age(Math.max(0, now - data.updatedAt))} ago`}
            </span>
            <span className="desktop-only">
              Checked {age(Math.max(0, now - data.fetchedAt))} ago
            </span>
          </>
        ) : (
          <span>
            {isError ? "Could not reach the oracle" : "Connecting to Chainlink"}
          </span>
        )}
        <button
          aria-label="Refresh ETH price"
          className="icon-button"
          disabled={isFetching}
          onClick={() => refetch()}
        >
          <RefreshCw size={13} className={isFetching ? "spinning" : ""} />
        </button>
        <a
          href="https://sepolia.etherscan.io/address/0x694AA1769357215DE4FAC081bf1f309aDC325306"
          target="_blank"
          rel="noreferrer"
        >
          Chainlink <ArrowUpRight size={12} />
        </a>
      </div>
    </div>
  );
}
