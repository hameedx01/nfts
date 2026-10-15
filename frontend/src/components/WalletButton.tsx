"use client";
import { useEffect, useRef, useState } from "react";
import {
  useConnection,
  useConnect,
  useDisconnect,
  useSwitchChain,
} from "wagmi";
import { Wallet, X, ArrowUpRight } from "lucide-react";
import { AddressDisplay } from "./AddressDisplay";
export function WalletButton({ full = false }: { full?: boolean }) {
  const { address, chainId, isConnected } = useConnection();
  const { connectors, connect, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, error: switchError } = useSwitchChain();
  const dialog = useRef<HTMLDialogElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    if (isConnected) dialog.current?.close();
  }, [isConnected]);
  return (
    <>
      {mounted && address ? (
        <div className="wallet-group">
          {chainId !== 11155111 ? (
            <button
              className="button small"
              onClick={() => switchChain({ chainId: 11155111 })}
            >
              Switch to Sepolia
            </button>
          ) : (
            <button
              className="button wallet-button"
              onClick={() => dialog.current?.showModal()}
            >
              <span className="status-dot" />
              <AddressDisplay address={address} />
            </button>
          )}
          {switchError && (
            <span className="error-text">Network switch declined.</span>
          )}
        </div>
      ) : (
        <button
          className={`button ${full ? "wide" : ""}`}
          onClick={() => dialog.current?.showModal()}
        >
          <Wallet size={16} />
          Connect wallet
          <ArrowUpRight size={15} />
        </button>
      )}
      <dialog
        aria-label="Wallet connection"
        ref={dialog}
        className="wallet-dialog"
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
      >
        <div className="dialog-heading">
          <span className="eyebrow">YOUR STUDIO PASSPORT</span>
          <button
            className="icon-button"
            aria-label="Close wallet dialog"
            onClick={() => dialog.current?.close()}
          >
            <X size={20} />
          </button>
        </div>
        <h2>{address ? "Your wallet" : "Come on in."}</h2>
        <p>
          {address ? (
            <AddressDisplay address={address} />
          ) : (
            "Connect to publish your work. Browsing is always open."
          )}
        </p>
        {address ? (
          <button
            className="button wide"
            onClick={() => {
              disconnect();
              dialog.current?.close();
            }}
          >
            Disconnect wallet
          </button>
        ) : (
          connectors.map((connector) => (
            <button
              className="button outline wide"
              disabled={isPending}
              key={connector.uid}
              onClick={() => connect({ connector })}
            >
              {connector.name === "Injected"
                ? "Browser wallet"
                : connector.name}
              <ArrowUpRight size={16} />
            </button>
          ))
        )}
        {error && (
          <p role="alert" className="error-text">
            {error.message.split("Details:")[0].slice(0, 180)}
          </p>
        )}
        {!process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID && !address && (
          <p className="fine-print">
            Use a wallet browser or browser extension. WalletConnect mobile
            pairing becomes available after the studio owner adds its project
            ID.
          </p>
        )}
        <p className="fine-print">Ethereum Sepolia · Test ETH only</p>
      </dialog>
    </>
  );
}
