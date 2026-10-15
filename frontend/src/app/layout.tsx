import type { Metadata } from "next";
import { Providers } from "./providers";
import { Shell } from "@/components/Shell";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "Edition — an onchain creative studio",
    template: "%s | Edition",
  },
  description:
    "Turn your artwork into a one-of-one edition. Upload to IPFS, mint on Sepolia, and meet the people behind the work with ENS.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
