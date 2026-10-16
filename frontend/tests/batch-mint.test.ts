import test from "node:test";
import assert from "node:assert/strict";
import { concat, encodeFunctionData, toHex, type Hex } from "viem";
import {
  batchMintCalls,
  validateMintBatch,
  safeExecuteAbi,
  multiSendAbi,
  SAFE_MULTISEND,
} from "../src/lib/batch-mint";
import { CONTRACT } from "../src/lib/config";
const uri = "ipfs://bafytest/metadata.json";
function encodeBatch(
  calls: { to: Hex; value: bigint; data: Hex; operation?: number }[],
) {
  const packed = concat(
    calls.map((call) =>
      concat([
        toHex(call.operation ?? 0, { size: 1 }),
        call.to,
        toHex(call.value, { size: 32 }),
        toHex((call.data.length - 2) / 2, { size: 32 }),
        call.data,
      ]),
    ),
  );
  return encodeFunctionData({
    abi: safeExecuteAbi,
    functionName: "executeUserOpWithErrorString",
    args: [
      SAFE_MULTISEND,
      0n,
      encodeFunctionData({
        abi: multiSendAbi,
        functionName: "multiSend",
        args: [packed],
      }),
      1,
    ],
  });
}
test("the mint batch contains two zero-value calls to the collection", () => {
  const calls = batchMintCalls(uri);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].to, CONTRACT);
  assert.deepEqual(validateMintBatch(encodeBatch(calls)), [uri, uri]);
});
test("reject sponsorship of another contract, value transfer, delegatecall, wrong count or mixed artwork", () => {
  const calls = batchMintCalls(uri);
  for (const invalid of [
    [calls[0]],
    [...calls, calls[0]],
    [
      { ...calls[0], to: "0x1111111111111111111111111111111111111111" as Hex },
      calls[1],
    ],
    [{ ...calls[0], value: 1n }, calls[1]],
    [{ ...calls[0], operation: 1 }, calls[1]],
    [calls[0], batchMintCalls("ipfs://different")[0]],
    [{ ...calls[0], data: "0xdeadbeef" as Hex }, calls[1]],
  ])
    assert.throws(() => validateMintBatch(encodeBatch(invalid)));
});
test("reject non-IPFS and oversized metadata URIs", () => {
  assert.throws(() => batchMintCalls("https://example.com/file"));
  assert.throws(() => batchMintCalls("ipfs://" + "a".repeat(513)));
});

test("accepts the real permissionless Safe batch encoding", async () => {
  const { toSafeSmartAccount } = await import("permissionless/accounts");
  const { createPublicClient, custom } = await import("viem");
  const { privateKeyToAccount } = await import("viem/accounts");
  const { sepolia } = await import("viem/chains");
  const { entryPoint07Address } = await import("viem/account-abstraction");
  // Public test key only; this fixture never broadcasts or accesses the network.
  const owner = privateKeyToAccount(`0x${"1".repeat(64)}`);
  const account = await toSafeSmartAccount({
    client: createPublicClient({ chain: sepolia, transport: custom({ request: async () => { throw new Error("Unexpected RPC in encoding test"); } }) }),
    owners: [owner], version: "1.4.1", address: "0x1111111111111111111111111111111111111111",
    entryPoint: { address: entryPoint07Address, version: "0.7" }, saltNonce: 0n,
  });
  assert.deepEqual(validateMintBatch(await account.encodeCalls(batchMintCalls(uri))), [uri, uri]);
});
