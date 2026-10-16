"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/format";
export type MintAlert = {
  id: string;
  transactionHash: string;
  blockNumber: string;
  address: string;
  tokenId: string;
  uri: string;
  live?: boolean;
};
type EventResponse = { events: MintAlert[]; nextBlock: string; head: string };
export function useContractAlerts() {
  const [events, setEvents] = useState<MintAlert[]>([]);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    let stopped = false;
    let cursor: string | undefined;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    async function poll() {
      let delay = 4000;
      try {
        const result = await api<EventResponse>(
          `/api/events${cursor ? `?fromBlock=${cursor}` : ""}`,
          { signal: controller.signal },
        );
        if (stopped) return;
        const live = Boolean(cursor);
        setEvents((previous) => {
          const seen = new Set(previous.map((event) => event.id));
          const fresh = result.events
            .filter((event) => !seen.has(event.id))
            .map((event) => ({ ...event, live }));
          return fresh.length
            ? [...fresh.reverse(), ...previous].slice(0, 100)
            : previous;
        });
        cursor = result.nextBlock;
        if (BigInt(cursor) <= BigInt(result.head)) delay = 250;
        setError("");
        setConnected(true);
      } catch {
        if (!stopped) {
          setError(
            "Connection interrupted. Retrying and catching up automatically…",
          );
          setConnected(false);
        }
      } finally {
        if (!stopped) timer = setTimeout(poll, delay);
      }
    }
    void poll();
    return () => {
      stopped = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, []);
  return { events, error, connected };
}
