import "server-only";
import { toAccount } from "viem/accounts";
import { isAddress, type Address } from "viem";
import { toSafeSmartAccount } from "permissionless/accounts";
import { entryPoint07Address } from "viem/account-abstraction";
import { sepoliaClient } from "./clients";
import { PublicError } from "./response";
export async function validateStudioSender(
  owner: string | null,
  operation: Record<string, unknown>,
) {
  if (!owner || !isAddress(owner))
    throw new PublicError("Missing owner address.");
  // Derive the expected Safe without holding a signer or accepting arbitrary init code.
  const unavailable = async (): Promise<never> => {
    throw new Error("Server cannot sign.");
  };
  const account = await toSafeSmartAccount({
    client: sepoliaClient,
    owners: [
      toAccount({
        address: owner as Address,
        signMessage: unavailable,
        signTransaction: unavailable,
        signTypedData: unavailable,
      }),
    ],
    version: "1.4.1",
    saltNonce: 0n,
    entryPoint: { address: entryPoint07Address, version: "0.7" },
  });
  if (String(operation.sender).toLowerCase() !== account.address.toLowerCase())
    throw new PublicError("Use the studio Safe account for this owner.");
  if (operation.factory || operation.factoryData) {
    const expected = await account.getFactoryArgs();
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
