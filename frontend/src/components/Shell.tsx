"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Asterisk } from "lucide-react";
import { WalletButton } from "./WalletButton";
import { PriceTicker } from "./PriceTicker";
import { CONTRACT, EXPLORER } from "@/lib/config";
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <Link href="/" className="wordmark" aria-label="Edition Studio home">
          <Asterisk size={29} strokeWidth={1.5} />
          <span>
            edition<span className="wordmark-period">.</span>
          </span>
          <span className="wordmark-sub">
            AN ONCHAIN
            <br />
            CREATIVE STUDIO
          </span>
        </Link>
        <nav aria-label="Main navigation">
          <Link href="/" aria-current={path === "/" ? "page" : undefined}>
            The studio
          </Link>
          <Link
            href="/gallery"
            aria-current={path.startsWith("/gallery") ? "page" : undefined}
          >
            The collection
          </Link>
          <Link
            href="/alerts"
            aria-current={path === "/alerts" ? "page" : undefined}
          >
            Live alerts
          </Link>
        </nav>
        <WalletButton />
      </header>
      <PriceTicker />
      <main id="main">{children}</main>
      <footer className="site-footer">
        <Link className="footer-brand" href="/">
          edition.
        </Link>
        <p>A little creativity. A permanent record.</p>
        <a
          href={`${EXPLORER}/address/${CONTRACT}`}
          target="_blank"
          rel="noreferrer"
        >
          View collection contract <ArrowUpRight size={14} />
        </a>
        <span className="network-label">
          <span className="status-dot" />
          SEPOLIA TESTNET
        </span>
      </footer>
    </>
  );
}
