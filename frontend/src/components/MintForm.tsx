"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  useConnection,
  usePublicClient,
  useSignMessage,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { decodeEventLog, formatEther, type Hex } from "viem";
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  ImagePlus,
  LockKeyhole,
  Upload,
  X,
} from "lucide-react";
import { classNftAbi } from "@/lib/contracts/classNftAbi";
import { CONTRACT, EXPLORER, FEED_MAX_AGE, MAX_FILE_SIZE } from "@/lib/config";
import { api, usd } from "@/lib/format";
import { contentDigest, uploadMessage } from "@/lib/upload";
import { ipfsUrl } from "@/lib/ipfs";
import { useEthPrice } from "@/hooks/useEthPrice";
import { WalletButton } from "./WalletButton";
import { AddressDisplay } from "./AddressDisplay";
type UploadResult = { uri: string; imageUri: string };
export function MintForm() {
  const { address, chainId } = useConnection();
  const client = usePublicClient({ chainId: 11155111 });
  const { signMessageAsync } = useSignMessage();
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();
  const queryClient = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [uploaded, setUploaded] = useState<UploadResult | null>(null);
  const [stage, setStage] = useState("");
  const [error, setError] = useState("");
  const [hash, setHash] = useState<Hex | null>(null);
  const [tokenId, setTokenId] = useState<string | null>(null);
  const [actualGas, setActualGas] = useState<bigint | null>(null);
  const [dragging, setDragging] = useState(false);
  const price = useEthPrice();
  const livePrice =
    price.data &&
    !price.isError &&
    !price.data.stale &&
    Date.now() / 1000 - price.data.updatedAt <= FEED_MAX_AGE
      ? price.data.price
      : null;
  const busy = Boolean(stage);
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const estimate = useQuery({
    queryKey: ["mint-estimate", uploaded?.uri, address],
    enabled: Boolean(
      uploaded && address && client && tokenId === null && !hash,
    ),
    queryFn: async () => {
      const [gas, fees] = await Promise.all([
        client!.estimateContractGas({
          account: address!,
          address: CONTRACT,
          abi: classNftAbi,
          functionName: "mint",
          args: [uploaded!.uri],
        }),
        client!.estimateFeesPerGas(),
      ]);
      return gas * (fees.maxFeePerGas ?? fees.gasPrice ?? 0n);
    },
    refetchInterval: 30000,
    retry: 1,
  });
  function selectFile(next?: File) {
    if (!next || busy || uploaded) return;
    setError("");
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(next.type) ||
      next.size > MAX_FILE_SIZE ||
      next.size === 0
    ) {
      setError("Choose a PNG, JPEG, or WebP image up to 3 MB.");
      return;
    }
    setFile(next);
  }
  function describeError(e: unknown) {
    const text = (e as Error).message || "";
    return /reject|denied/i.test(text)
      ? "You declined the wallet request. Your work is still here when you’re ready."
      : /insufficient/i.test(text)
        ? "Your wallet needs more Sepolia test ETH for the network fee."
        : text.includes("HTTP") || text.includes("rpc")
          ? "Could not reach Sepolia. Please try again."
          : text
              .split("Request Arguments:")[0]
              .split("Details:")[0]
              .slice(0, 240);
  }
  async function upload() {
    if (!file || !address) return;
    setError("");
    try {
      setStage("Approve the upload in your wallet");
      const timestamp = String(Date.now());
      const digest = await contentDigest(
        await file.arrayBuffer(),
        name.trim(),
        description.trim(),
      );
      const signature = await signMessageAsync({
        message: uploadMessage(address, digest, timestamp),
      });
      setStage("Pinning your image and story to IPFS");
      const form = new FormData();
      form.set("file", file);
      form.set("name", name.trim());
      form.set("description", description.trim());
      form.set("address", address);
      form.set("timestamp", timestamp);
      form.set("signature", signature);
      setUploaded(
        await api<UploadResult>("/api/upload", { method: "POST", body: form }),
      );
    } catch (e) {
      setError(describeError(e));
    } finally {
      setStage("");
    }
  }
  async function confirm(transactionHash: Hex) {
    setStage("Waiting for confirmation on Sepolia");
    const receipt = await client!.waitForTransactionReceipt({
      hash: transactionHash,
      timeout: 120000,
      onReplaced: (replacement) => setHash(replacement.transaction.hash),
    });
    if (receipt.status !== "success") {
      setHash(null);
      throw new Error(
        "The transaction reverted. Your IPFS upload is saved; you can try minting again.",
      );
    }
    let minted: string | null = null;
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== CONTRACT.toLowerCase()) continue;
      try {
        const event = decodeEventLog({
          abi: classNftAbi,
          data: log.data,
          topics: log.topics,
        });
        if (event.eventName === "Minted")
          minted = event.args.tokenId.toString();
      } catch {}
    }
    if (minted === null) {
      setHash(null);
      throw new Error(
        "The transaction completed without minting, possibly because it was cancelled in your wallet. Your upload is saved for retry.",
      );
    }
    setTokenId(minted);
    setActualGas(receipt.gasUsed * receipt.effectiveGasPrice);
    await queryClient.invalidateQueries({ queryKey: ["nfts"] });
  }
  async function mint() {
    if (!address || !uploaded || !client) return;
    setError("");
    try {
      if (chainId !== 11155111) {
        setStage("Switch your wallet to Sepolia");
        await switchChainAsync({ chainId: 11155111 });
      }
      setStage("Confirm the mint in your wallet");
      const simulation = await client.simulateContract({
        account: address,
        address: CONTRACT,
        abi: classNftAbi,
        functionName: "mint",
        args: [uploaded.uri],
      });
      const tx = await writeContractAsync({
        ...simulation.request,
        chainId: 11155111,
      });
      setHash(tx);
      await confirm(tx);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setStage("");
    }
  }
  async function recheck() {
    if (!hash) return;
    setError("");
    try {
      await confirm(hash);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setStage("");
    }
  }
  function reset() {
    setFile(null);
    setUploaded(null);
    setName("");
    setDescription("");
    setTokenId(null);
    setHash(null);
    setActualGas(null);
    setError("");
    if (input.current) input.current.value = "";
  }
  return (
    <section id="create" className="create-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">FROM YOUR DEVICE TO THE CHAIN</span>
          <h2>Your next edition starts here.</h2>
        </div>
        <span className="section-index">01 / CREATE</span>
      </div>
      <div className="mint-panel">
        <div className="upload-column">
          <div className="upload-topline">
            <span className="mini-label">THE ARTWORK</span>
            <span>01</span>
          </div>
          <input
            ref={input}
            id="artwork-file"
            className="visually-hidden"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => selectFile(e.target.files?.[0])}
            disabled={busy || Boolean(uploaded)}
          />
          <div
            className={`dropzone ${dragging ? "dragging" : ""} ${preview ? "has-preview" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              selectFile(e.dataTransfer.files[0]);
            }}
          >
            {preview ? (
              <>
                <img src={preview} alt="Your artwork preview" />
                {!uploaded && (
                  <button
                    className="remove-image icon-button"
                    aria-label="Remove selected image"
                    disabled={busy}
                    onClick={() => {
                      setFile(null);
                      if (input.current) input.current.value = "";
                    }}
                  >
                    <X size={17} />
                  </button>
                )}
                <span className="preview-label">
                  {uploaded ? "PINNED TO IPFS" : "YOUR ARTWORK PREVIEW"}
                </span>
              </>
            ) : (
              <button
                type="button"
                className="upload-target"
                onClick={() => input.current?.click()}
              >
                <span className="upload-symbol">
                  <ImagePlus size={32} strokeWidth={1.2} />
                </span>
                <strong>Drop something wonderful.</strong>
                <span>
                  Drag your image here, or <u>browse files</u>
                </span>
                <small>JPG, PNG or WEBP · Up to 3 MB</small>
              </button>
            )}
          </div>
          <div className="upload-footnote">
            <LockKeyhole size={14} />
            <span>
              {uploaded
                ? "Your artwork is pinned. Ready for its onchain home."
                : "Your artwork is uploaded through our secure server."}
            </span>
          </div>
          {uploaded && (
            <a
              className="text-link ipfs-link"
              href={ipfsUrl(uploaded.imageUri)}
              target="_blank"
              rel="noreferrer"
            >
              View your image on IPFS <ArrowUpRight size={14} />
            </a>
          )}
        </div>
        <div className="mint-fields">
          <div className="upload-topline">
            <span className="mini-label">THE STORY</span>
            <span>02</span>
          </div>
          {tokenId !== null ? (
            <div className="mint-success" role="status">
              <CheckCircle2 size={42} strokeWidth={1.3} />
              <span className="eyebrow">OFFICIALLY ONCHAIN</span>
              <h3>You made an edition.</h3>
              <p>
                Edition #{tokenId} is in your wallet. Its image and story are
                pinned to IPFS.
              </p>
              {actualGas !== null && (
                <p className="fine-print">
                  Network fee: {Number(formatEther(actualGas)).toFixed(7)} ETH{" "}
                  {livePrice &&
                    `≈ ${usd(Number(formatEther(actualGas)) * livePrice)}`}
                </p>
              )}
              <Link href={`/nft/${tokenId}`} className="button orange wide">
                View your edition <ArrowUpRight size={17} />
              </Link>
              <button className="text-link" onClick={reset}>
                Make another
              </button>
            </div>
          ) : (
            <>
              <label htmlFor="title">
                Give it a name <span>REQUIRED</span>
              </label>
              <input
                id="title"
                placeholder="Something only you could make"
                value={name}
                maxLength={80}
                onChange={(e) => setName(e.target.value)}
                disabled={busy || Boolean(uploaded)}
              />
              <div className="label-row">
                <label htmlFor="description">
                  Tell its story <span>OPTIONAL</span>
                </label>
                <span className="character-count">
                  {description.length}/500
                </span>
              </div>
              <textarea
                id="description"
                placeholder="The idea, the moment, the happy accident behind it…"
                value={description}
                maxLength={500}
                onChange={(e) => setDescription(e.target.value)}
                disabled={busy || Boolean(uploaded)}
              />
              <div className="mint-summary">
                <div>
                  <span>Mint price</span>
                  <strong>
                    Free <span className="muted">/ 0 ETH</span>
                  </strong>
                </div>
                <div>
                  <span>Estimated network fee</span>
                  <strong>
                    {estimate.data !== undefined
                      ? `${Number(formatEther(estimate.data)).toFixed(6)} ETH`
                      : uploaded
                        ? estimate.isError
                          ? "Estimate unavailable"
                          : "Estimating…"
                        : "Calculated after upload"}
                  </strong>
                </div>
                {estimate.data !== undefined && (
                  <div>
                    <span>At the current ETH price</span>
                    <strong>
                      {livePrice
                        ? `≈ ${usd(Number(formatEther(estimate.data)) * livePrice)}`
                        : "Live price unavailable"}
                    </strong>
                  </div>
                )}
                <div>
                  <span>Network</span>
                  <span>
                    <span className="status-dot" /> Ethereum Sepolia
                  </span>
                </div>
                {address && (
                  <div>
                    <span>Minting to</span>
                    <AddressDisplay address={address} />
                  </div>
                )}
              </div>
              {estimate.isError && (
                <button
                  className="text-link"
                  onClick={() => estimate.refetch()}
                >
                  Retry fee estimate
                </button>
              )}
              <div className="mint-action">
                {!address ? (
                  <WalletButton full />
                ) : hash ? (
                  <button
                    className="button wide"
                    onClick={recheck}
                    disabled={busy}
                  >
                    {busy ? (
                      <>
                        <span className="spinner" />
                        {stage}
                      </>
                    ) : (
                      "Check transaction confirmation"
                    )}
                  </button>
                ) : (
                  <button
                    className="button orange wide"
                    disabled={busy || !file || !name.trim()}
                    onClick={uploaded ? mint : upload}
                  >
                    {busy ? (
                      <>
                        <span className="spinner" />
                        {stage}
                      </>
                    ) : uploaded ? (
                      <>
                        Mint your edition <ArrowUpRight size={18} />
                      </>
                    ) : (
                      <>
                        Upload & prepare <Upload size={17} />
                      </>
                    )}
                  </button>
                )}
                <p className="fine-print centered">
                  {uploaded
                    ? "Your wallet will ask you to confirm a transaction."
                    : "First, a free signature to authorize your upload."}
                </p>
              </div>
              {uploaded && !hash && !busy && (
                <button className="text-link" onClick={() => setUploaded(null)}>
                  Edit artwork or story
                </button>
              )}
            </>
          )}
          {error && (
            <div className="error-notice" role="alert">
              {error}
            </div>
          )}
          {hash && (
            <a
              className="text-link transaction-link"
              href={`${EXPLORER}/tx/${hash}`}
              target="_blank"
              rel="noreferrer"
            >
              View transaction <ArrowUpRight size={14} />
            </a>
          )}
        </div>
      </div>
      <div className="create-notes">
        <span>
          <Check size={14} />
          Your wallet owns the NFT
        </span>
        <span>
          <Check size={14} />
          Public IPFS storage
        </span>
        <span>
          <Check size={14} />
          Test ETH only · USD figures are reference estimates
        </span>
      </div>
    </section>
  );
}
