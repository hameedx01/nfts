import {
  decodeFunctionData,
  encodeFunctionData,
  parseAbi,
  size,
  slice,
  type Hex,
} from "viem";
import { classNftAbi } from "./contracts/classNftAbi";
import { CONTRACT } from "./config";
export const SAFE_MULTISEND = "0x9641d764fc13c8B624c04430C7356C1C7C8102e2";
export const safeExecuteAbi = parseAbi([
  "function executeUserOpWithErrorString(address to, uint256 value, bytes data, uint8 operation)",
]);
export const multiSendAbi = parseAbi([
  "function multiSend(bytes transactions)",
]);
export function batchMintCalls(uri: string) {
  if (!/^ipfs:\/\/\S+$/.test(uri) || uri.length > 512)
    throw new Error("Use the uploaded IPFS metadata URI.");
  const call = {
    to: CONTRACT,
    value: 0n,
    data: encodeFunctionData({
      abi: classNftAbi,
      functionName: "mint",
      args: [uri],
    }),
  };
  return [{ ...call }, { ...call }];
}
// Decode every nested call: a top-level Safe execution selector alone is not sufficient.
export function validateMintBatch(data: Hex) {
  const execution = decodeFunctionData({ abi: safeExecuteAbi, data });
  const [to, value, inner, operation] = execution.args;
  if (
    to.toLowerCase() !== SAFE_MULTISEND.toLowerCase() ||
    value !== 0n ||
    operation !== 1
  )
    throw new Error("Only the studio mint batch is allowed.");
  const packed = decodeFunctionData({ abi: multiSendAbi, data: inner }).args[0];
  let offset = 0;
  const uris: string[] = [];
  while (offset < size(packed)) {
    if (uris.length >= 2 || size(packed) - offset < 85)
      throw new Error("Exactly two calls are required.");
    const op = BigInt(slice(packed, offset, offset + 1));
    const target = slice(packed, offset + 1, offset + 21);
    const amount = BigInt(slice(packed, offset + 21, offset + 53));
    const length = BigInt(slice(packed, offset + 53, offset + 85));
    offset += 85;
    if (
      op !== 0n ||
      amount !== 0n ||
      target.toLowerCase() !== CONTRACT.toLowerCase() ||
      length > 2048n ||
      length > BigInt(size(packed) - offset)
    )
      throw new Error("Only zero-value NFT mint calls are allowed.");
    const call = decodeFunctionData({
      abi: classNftAbi,
      data: slice(packed, offset, offset + Number(length)),
    });
    if (call.functionName !== "mint")
      throw new Error("Only mint calls are allowed.");
    const uri = call.args[0];
    batchMintCalls(uri);
    uris.push(uri);
    offset += Number(length);
  }
  if (uris.length !== 2 || uris[0] !== uris[1])
    throw new Error("Mint two editions of the same artwork.");
  return uris;
}
