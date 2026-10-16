import {
  createPublicClient,
  http,
  type Account,
  type Chain,
  type Transport,
  type WalletClient,
} from "viem";
import { sepolia } from "viem/chains";
import { entryPoint07Address } from "viem/account-abstraction";
import { createSmartAccountClient } from "permissionless";
import { toSafeSmartAccount } from "permissionless/accounts";
import { createPimlicoClient } from "permissionless/clients/pimlico";
export async function createStudioAccount(
  owner: WalletClient<Transport, Chain, Account>,
) {
  const client = createPublicClient({
    chain: sepolia,
    transport: http("https://ethereum-sepolia-rpc.publicnode.com"),
  });
  const account = await toSafeSmartAccount({
    client,
    owners: [owner],
    version: "1.4.1",
    entryPoint: { address: entryPoint07Address, version: "0.7" },
    saltNonce: 0n,
  });
  const transport = () =>
    http("/api/pimlico", {
      retryCount: 0,
      fetchOptions: { headers: { "x-studio-owner": owner.account.address } },
    });
  const pimlico = createPimlicoClient({
    chain: sepolia,
    transport: transport(),
    entryPoint: { address: entryPoint07Address, version: "0.7" },
  });
  return createSmartAccountClient({
    account,
    chain: sepolia,
    client,
    bundlerTransport: transport(),
    paymaster: pimlico,
    userOperation: {
      estimateFeesPerGas: async () =>
        (await pimlico.getUserOperationGasPrice()).fast,
    },
  });
}
