export type Nft = {
  id: string;
  owner: `0x${string}`;
  uri: string;
  name: string;
  description: string;
  image: string | null;
  metadataError?: boolean;
};
export type Price = {
  price: number;
  updatedAt: number;
  fetchedAt: number;
  roundId: string;
  stale: boolean;
};
export type Identity = { address: `0x${string}` | null; name: string | null };
