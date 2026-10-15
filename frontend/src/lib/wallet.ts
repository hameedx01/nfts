import { createConfig, http } from "wagmi";
import { sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors/injected";
import { walletConnect } from "wagmi/connectors/walletConnect";
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
export const walletConfig = createConfig({
  chains: [sepolia],
  ssr: true,
  connectors: [
    injected(),
    ...(projectId
      ? [
          walletConnect({
            projectId,
            showQrModal: true,
            metadata: {
              name: "Edition Studio",
              description: "Make something worth keeping.",
              url:
                typeof window !== "undefined"
                  ? window.location.origin
                  : "https://example.com",
              icons: [],
            },
          }),
        ]
      : []),
  ],
  transports: {
    [sepolia.id]: http("https://ethereum-sepolia-rpc.publicnode.com"),
  },
});
