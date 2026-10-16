"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useContractAlerts, type MintAlert } from "@/hooks/useContractAlerts";
import { AddressDisplay } from "./AddressDisplay";
import { CONTRACT, EXPLORER } from "@/lib/config";
import { api, shortAddress } from "@/lib/format";

export function LiveAlerts() {
  const { events, error, connected } = useContractAlerts();
  const [permission, setPermission] = useState("default");
  const [notice, setNotice] = useState("");
  const [toasts, setToasts] = useState<MintAlert[]>([]);
  const notified = useRef(new Set<string>());
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    setPermission(
      "Notification" in window ? Notification.permission : "unsupported",
    );
  }, []);
  useEffect(() => {
    for (const event of events) {
      if (!event.live || notified.current.has(event.id)) continue;
      notified.current.add(event.id);
      setToasts((items) => [event, ...items].slice(0, 5));
      void (async () => {
        if (
          !("Notification" in window) ||
          Notification.permission !== "granted"
        )
          return;
        let label = shortAddress(event.address);
        try {
          const identity = await api<{ name: string | null }>(
            `/api/ens?q=${event.address}`,
          );
          label = identity.name || label;
        } catch {
          /* Address is an honest fallback when ENS is unavailable. */
        }
        if (!mounted.current) return;
        const title = `Edition #${event.tokenId} minted`;
        const options = {
          body: `${label} received an NFT in Edition Studio.`,
          tag: event.id,
        };
        try {
          if ("serviceWorker" in navigator) {
            const registration =
              await navigator.serviceWorker.getRegistration();
            if (!registration?.active) {
              new Notification(title, options);
              return;
            }
            await registration.showNotification(title, {
              ...options,
              data: { url: `/nft/${event.tokenId}` },
            });
          } else {
            new Notification(title, options);
          }
        } catch {
          setNotice(
            "Your browser could not show a system notification. Live pop-ups remain enabled here.",
          );
        }
      })();
    }
  }, [events]);
  async function enable() {
    try {
      if (!("Notification" in window)) {
        setNotice(
          "System notifications are not supported here. In-page pop-ups are enabled.",
        );
        return;
      }
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted" && "serviceWorker" in navigator)
        await navigator.serviceWorker.register("/notifications-sw.js");
      if (result === "denied")
        setNotice(
          "Notifications are blocked. Enable them in your browser’s site settings; in-page pop-ups still work.",
        );
    } catch {
      setNotice(
        "Notifications could not be enabled. In-page pop-ups still work.",
      );
    }
  }
  useEffect(() => {
    if (permission === "granted" && "serviceWorker" in navigator)
      void navigator.serviceWorker
        .register("/notifications-sw.js")
        .catch(() => {});
  }, [permission]);
  return (
    <section className="alerts-page">
      <span className="eyebrow">THE COLLECTION, AS IT HAPPENS</span>
      <h1>Live mint alerts.</h1>
      <p>
        Watch new editions arrive on Sepolia. Keep this page open to receive
        alerts.
      </p>
      <div className="alerts-toolbar">
        <span role="status">
          <span className={`status-dot ${connected ? "" : "offline"}`} />
          {connected ? "Listening · checks every 4 seconds" : "Connecting…"}
        </span>
        <button
          className="button"
          onClick={enable}
          disabled={permission === "granted" || permission === "unsupported"}
        >
          {permission === "granted"
            ? "Browser notifications enabled"
            : permission === "unsupported"
              ? "In-page pop-ups enabled"
              : "Enable browser notifications"}
        </button>
      </div>
      <p className="fine-print">
        Watching{" "}
        <a
          href={`${EXPLORER}/address/${CONTRACT}`}
          target="_blank"
          rel="noreferrer"
        >
          {shortAddress(CONTRACT)}
        </a>
        . Verified ENS names appear when available; otherwise we show the
        address. Events are observed before finality and can change after a
        chain reorganization.
      </p>
      {(error || notice) && (
        <p className="error-notice" role="status">
          {error || notice}
        </p>
      )}
      <div className="alert-feed" aria-live="polite">
        {!events.length && (
          <p className="empty-alerts">
            No recent mints yet. <Link href="/">Mint an edition</Link> in
            another tab and watch it appear here.
          </p>
        )}
        {events.map((event) => (
          <article className="alert-card" key={event.id}>
            <div>
              <span className="eyebrow">
                {event.live ? "NEW MINT" : "RECENT MINT"}
              </span>
              <h2>
                <Link href={`/nft/${event.tokenId}`}>
                  Edition #{event.tokenId}
                </Link>
              </h2>
              <p>
                Received by <AddressDisplay address={event.address} />
              </p>
            </div>
            <div>
              <span className="fine-print">Block {event.blockNumber}</span>
              <a
                className="text-link"
                href={`${EXPLORER}/tx/${event.transactionHash}`}
                target="_blank"
                rel="noreferrer"
              >
                View transaction ↗
              </a>
            </div>
          </article>
        ))}
      </div>
      <div className="alert-toasts" aria-live="polite">
        {toasts.map((event) => (
          <div className="alert-toast" key={event.id}>
            <button
              aria-label={`Dismiss edition ${event.tokenId} alert`}
              onClick={() =>
                setToasts((items) =>
                  items.filter((item) => item.id !== event.id),
                )
              }
            >
              ×
            </button>
            <strong>Edition #{event.tokenId} minted</strong>
            <p>
              <AddressDisplay address={event.address} /> received a new edition.
            </p>
            <Link href={`/nft/${event.tokenId}`}>View edition ↗</Link>
          </div>
        ))}
      </div>
    </section>
  );
}
