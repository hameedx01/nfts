import "server-only";
import { toAccount } from "viem/accounts";
import {
  createPublicClient,
  fallback,
  http,
  isAddress,
  type Address,
} from "viem";
import { sepolia } from "viem/chains";
import { toSafeSmartAccount } from "permissionless/accounts";
import { entryPoint07Address } from "viem/account-abstraction";
const publicRpc = "https://ethereum-sepolia-rpc.publicnode.com";
const urls = [
  ...new Set([process.env.SEPOLIA_RPC_URL || publicRpc, publicRpc]),
];
const validationClient = createPublicClient({
  chain: sepolia,
  transport: fallback(
    urls.map((url) => http(url, { timeout: 4000, retryCount: 0 })),
    { retryCount: 1 },
  ),
});
// Address and initialization are deterministic for this fixed owner/version/salt.
// Coalesce concurrent requests; never cache failures or signed operations.
const accounts = new Map<
  string,
  { until: number; value: ReturnType<typeof deriveStudioAccount> }
>();
async function deriveStudioAccount(owner: Address) {
  const unavailable = async (): Promise<never> => {
    throw new Error("Server cannot sign.");
  };
  const account = await toSafeSmartAccount({
    client: validationClient,
    owners: [
      toAccount({
        address: owner,
        signMessage: unavailable,
        signTransaction: unavailable,
        signTypedData: unavailable,
      }),
    ],
    version: "1.4.1",
    saltNonce: 0n,
    entryPoint: { address: entryPoint07Address, version: "0.7" },
  });
  const factory = await account.getFactoryArgs();
  return { address: account.address, factory };
}
async function studioAccount(owner: Address) {
  const key = owner.toLowerCase();
  const now = Date.now();
  for (const [key, entry] of accounts)
    if (entry.until < now) accounts.delete(key);
  let entry = accounts.get(key);
  if (!entry) {
    if (accounts.size >= 256) accounts.delete(accounts.keys().next().value!);
    entry = { until: now + 300000, value: deriveStudioAccount(owner) };
    accounts.set(key, entry);
  }
  try {
    return await entry.value;
  } catch {
    accounts.delete(key);
    throw new PublicError(
      "Sepolia could not verify your Safe account. Wait a moment and retry; no operation was submitted by this request.",
      503,
    );
  }
}
import { PublicError } from "./response";
export async function validateStudioSender(
  owner: string | null,
  operation: Record<string, unknown>,
) {
  if (!owner || !isAddress(owner))
    throw new PublicError("Missing owner address.");
  const account = await studioAccount(owner as Address);
  if (String(operation.sender).toLowerCase() !== account.address.toLowerCase())
    throw new PublicError("Use the studio Safe account for this owner.");
  if (operation.factory || operation.factoryData) {
    const expected = account.factory;
    if (
      !expected.factory ||
      String(operation.factory).toLowerCase() !==
        expected.factory.toLowerCase() ||
      String(operation.factoryData).toLowerCase() !==
        expected.factoryData?.toLowerCase()
    )
      throw new PublicError("Unsupported smart-account initialization.");
  }
}
