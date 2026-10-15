import { parseAbi } from "viem";
export const classNftAbi = parseAbi([
  "function mint(string uri) returns (uint256 tokenId)",
  "function totalMinted() view returns (uint256)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function name() view returns (string)",
  "event Minted(address indexed to, uint256 indexed tokenId, string uri)",
]);
