"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useWalletClient, useConnection, useSwitchChain } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { decodeEventLog, formatEther, type Hex } from "viem";
import { createStudioAccount } from "@/lib/smart-account";
import { describeSmartAccountError } from "@/lib/smart-account-errors";
import { batchMintCalls } from "@/lib/batch-mint";
import { classNftAbi } from "@/lib/contracts/classNftAbi";
import { CONTRACT, EXPLORER } from "@/lib/config";
import { AddressDisplay } from "./AddressDisplay";
type StudioAccount = Awaited<ReturnType<typeof createStudioAccount>>;
type Evidence = {
  hash: Hex;
  transactionHash: Hex;
  sender: string;
  from: string;
  to: string;
  paymaster: string;
  gas: string;
  tokenIds: string[];
};
export function SmartAccountMint({
  uri,
  disabled,
  onBusy,
}: {
  uri: string;
  disabled: boolean;
  onBusy: (value: boolean) => void;
}) {
  const { address, chainId } = useConnection();
  const { data: wallet } = useWalletClient();
  const { switchChainAsync } = useSwitchChain();
  const cache = useQueryClient();
  const [client, setClient] = useState<StudioAccount>();
  const [stage, setStage] = useState("");
  const [error, setError] = useState("");
  const [hash, setHash] = useState<Hex>();
  const [evidence, setEvidence] = useState<Evidence>();
  const lock = useRef(false);
  const walletIdentity = useRef(address);
  walletIdentity.current = address;
  const storageKey = `edition:batch:${address?.toLowerCase()}:${CONTRACT}`;
  useEffect(() => {
    setClient(undefined);
    setEvidence(undefined);
    setHash(undefined);
    setError("");
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved && /^0x[0-9a-fA-F]{64}$/.test(saved)) setHash(saved as Hex);
    } catch {}
  }, [address, storageKey]);
  async function run(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    onBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(describeSmartAccountError(e));
    } finally {
      lock.current = false;
      setStage("");
      onBusy(false);
    }
  }
  async function prepare() {
    if (!wallet) return;
    if (chainId !== 11155111) {
      setStage("Switch to Sepolia");
      await switchChainAsync({ chainId: 11155111 });
      return;
    }
    setStage("Preparing your Safe account");
    const owner = address;
    const next = await createStudioAccount(wallet);
    if (owner !== walletIdentity.current)
      throw new Error("Wallet changed. Prepare the account again.");
    setClient(next);
  }
  async function confirm(account: StudioAccount, operationHash: Hex) {
    setStage("Waiting for the two mints on Sepolia");
    const result = await account.waitForUserOperationReceipt({
      hash: operationHash,
      timeout: 120000,
      pollingInterval: 4000,
    });
    if (!result.success) {
      setHash(undefined);
      try {
        localStorage.removeItem(storageKey);
      } catch {}
      throw new Error(
        "The UserOperation reverted. No successful batch was recorded. You can retry.",
      );
    }
    const tokenIds: string[] = [];
    for (const log of result.logs) {
      if (log.address.toLowerCase() !== CONTRACT.toLowerCase()) continue;
      try {
        const event = decodeEventLog({
          abi: classNftAbi,
          data: log.data,
          topics: log.topics,
        });
        if (
          event.eventName === "Minted" &&
          event.args.to.toLowerCase() === account.account.address.toLowerCase()
        )
          tokenIds.push(event.args.tokenId.toString());
      } catch {}
    }
    if (tokenIds.length !== 2)
      throw new Error(
        "The operation was included, but two mint events could not be verified. Check Etherscan before submitting again.",
      );
    setEvidence({
      hash: operationHash,
      transactionHash: result.receipt.transactionHash,
      sender: result.sender,
      from: result.receipt.from,
      to: result.receipt.to || "",
      paymaster: result.paymaster || "Smart account (no paymaster)",
      gas: formatEther(result.actualGasCost),
      tokenIds,
    });
    await cache.invalidateQueries({ queryKey: ["nfts"] });
  }
  async function submit() {
    if (!client || !wallet || chainId !== 11155111)
      throw new Error("Connect the owner wallet on Sepolia first.");
    setStage("Approve one operation containing two mints");
    const operationHash = await client.sendUserOperation({
      calls: batchMintCalls(uri),
    });
    setHash(operationHash);
    try {
      localStorage.setItem(storageKey, operationHash);
    } catch {}
    await confirm(client, operationHash);
  }
  async function copyEvidence() {
    if (!evidence) return;
    const text = `UserOperation: ${evidence.hash}\nEtherscan transaction: ${EXPLORER}/tx/${evidence.transactionHash}\nSmart account: ${evidence.sender}\nFrom (outer transaction): ${evidence.from}\nTo (outer transaction / EntryPoint): ${evidence.to}\nPaymaster: ${evidence.paymaster}\nUserOperation gas cost: ${evidence.gas} Sepolia ETH\nMinted token IDs: ${evidence.tokenIds.join(", ")}`;
    try {
      await navigator.clipboard.writeText(text);
      setStage("Evidence copied");
      setTimeout(() => setStage(""), 1500);
    } catch {
      setError(
        "Clipboard unavailable. Copy the displayed transaction link and details instead.",
      );
    }
  }
  return (
    <section className="smart-mint" aria-label="Smart account batch mint">
      <span className="eyebrow">TWO EDITIONS · ONE APPROVAL</span>
      <h3>Mint with a smart account.</h3>
      <p>
        Create two editions of this artwork in one UserOperation. Your Safe owns
        both NFTs; your connected wallet controls the Safe.
      </p>
      <p className="fine-print">
        Gas: Pimlico paymaster sponsorship, subject to your studio’s policy. No
        automatic switch to paid minting.
      </p>
      {client && (
        <p className="smart-address">
          Your Safe:{" "}
          <a
            href={`${EXPLORER}/address/${client.account.address}`}
            target="_blank"
            rel="noreferrer"
          >
            {client.account.address}
          </a>
        </p>
      )}
      {address && (
        <p className="fine-print">
          Owner: <AddressDisplay address={address} />
        </p>
      )}
      {evidence ? (
        <div className="batch-result" role="status">
          <strong>Both editions confirmed.</strong>
          <div className="batch-links">
            {evidence.tokenIds.map((id) => (
              <Link key={id} href={`/nft/${id}`}>
                View edition #{id} ↗
              </Link>
            ))}
          </div>
          <a
            className="text-link"
            href={`${EXPLORER}/tx/${evidence.transactionHash}`}
            target="_blank"
            rel="noreferrer"
          >
            View UserOperation’s transaction on Etherscan ↗
          </a>
          <p className="fine-print">
            Gas payer (paymaster): {evidence.paymaster}
            <br />
            Operation cost: {evidence.gas} Sepolia ETH
          </p>
          <button className="button" onClick={copyEvidence}>
            Copy README evidence
          </button>
          <button
            className="text-link"
            onClick={() => {
              setEvidence(undefined);
              setHash(undefined);
              try {
                localStorage.removeItem(storageKey);
              } catch {}
            }}
          >
            Prepare another batch
          </button>
        </div>
      ) : (
        <button
          className="button wide"
          disabled={Boolean(stage) || disabled || !wallet}
          onClick={() =>
            void run(
              !client ? prepare : hash ? () => confirm(client, hash) : submit,
            )
          }
        >
          {stage ||
            (!client
              ? "Prepare smart account"
              : hash
                ? "Check pending UserOperation"
                : "Mint 2 with smart account")}
        </button>
      )}
      {hash && (
        <p className="fine-print operation-hash">UserOperation: {hash}</p>
      )}
      {error && (
        <p className="error-notice" role="alert">
          {error}
          {hash &&
            " Your operation hash is saved. Check its status before sending another batch."}
        </p>
      )}
      <Link className="text-link" href="/alerts" target="_blank">
        Open live alerts in another tab ↗
      </Link>
    </section>
  );
}
