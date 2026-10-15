import { NftDetail } from "@/components/NftDetail";
export default async function Page({
  params,
}: {
  params: Promise<{ tokenId: string }>;
}) {
  const { tokenId } = await params;
  return <NftDetail id={tokenId} />;
}
