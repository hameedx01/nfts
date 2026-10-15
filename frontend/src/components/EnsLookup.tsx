"use client";
import { useState } from "react";
import { ArrowRight, Check, Copy, Search } from "lucide-react";
import { api } from "@/lib/format";
import type { Identity } from "@/types/nft";
export function EnsLookup() {
  const [value, setValue] = useState("");
  const [data, setData] = useState<Identity | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setData(null);
    try {
      setData(
        await api<Identity>(`/api/ens?q=${encodeURIComponent(value.trim())}`),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="ens-section">
      <div>
        <span className="eyebrow">NAMES, NOT NUMBERS</span>
        <h2>
          A familiar name.
          <br />
          An onchain identity.
        </h2>
        <p>
          Look up any .eth name. We use ENS to put a name to the people behind
          the work.
        </p>
      </div>
      <div className="ens-box">
        <form onSubmit={lookup}>
          <label htmlFor="ens">Find an Ethereum identity</label>
          <div className="search-input">
            <Search size={18} />
            <input
              id="ens"
              placeholder="vitalik.eth"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              maxLength={255}
              required
              autoComplete="off"
              spellCheck={false}
            />
            <button
              className="icon-button"
              aria-label="Look up ENS name"
              disabled={busy}
            >
              {busy ? <span className="spinner" /> : <ArrowRight size={20} />}
            </button>
          </div>
        </form>
        <div aria-live="polite">
          {data?.address ? (
            <div className="ens-result">
              <span className="ens-avatar">
                {(data.name || "0x").slice(0, 2)}
              </span>
              <div>
                <strong>{data.name || "Ethereum address"}</strong>
                <a
                  href={`https://etherscan.io/address/${data.address}`}
                  target="_blank"
                  rel="noreferrer"
                  className="full-address"
                >
                  {data.address}
                </a>
              </div>
              <button
                className="icon-button"
                aria-label="Copy resolved address"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(data.address!);
                    setCopied(true);
                  } catch {
                    setError("Could not copy. Select the address to copy it.");
                  }
                }}
              >
                {copied ? <Check size={17} /> : <Copy size={17} />}
              </button>
            </div>
          ) : (
            <p className={error ? "error-text" : "fine-print"}>
              {error || "Resolved on Ethereum mainnet. No wallet needed."}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
