# Edition Studio

A small NFT studio built for the Web3Bridge Day 3 assignment. Upload original artwork to public IPFS through a protected server route, mint it into the class collection on Sepolia, and browse editions with ENS owner names. Chainlink powers automatically refreshed ETH/USD reference prices and gas conversions.

**Deployment:** Not deployed yet. Add the real Vercel production URL here after deployment and phone testing; no online completion is claimed.

## Run locally

Use Node.js 22.14 or newer (the `.nvmrc` selects Node 22).

```sh
cd frontend
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Add credentials only to the ignored `.env.local` file. The template deliberately documents the Pinata variable as a comment rather than an assignment so that the mentor's literal Git-history check will not flag a harmless placeholder.

```sh
npm run typecheck
npm test
npm run build
npm start
```

With the app running and Google Chrome installed, `npm run test:ui` checks desktop/mobile layout, the wallet dialog, input errors, navigation, and automatic refresh with controlled price responses. Screenshots are saved in the ignored `test-results/` folder. `npm run format` formats the source.

## Configuration

Names only; never commit credentials. Public addresses and the standard gateway have defaults in code. The application can browse through public RPC fallbacks, but dedicated RPC endpoints are recommended for deployment reliability.

| Variable | Purpose |
| --- | --- |
| `PINATA_JWT` | Server-only Pinata permission to upload public files |
| `SEPOLIA_RPC_URL` | Server-only Sepolia RPC endpoint for collection and price reads |
| `MAINNET_RPC_URL` | Server-only Ethereum mainnet RPC endpoint for ENS |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Public Reown/WalletConnect project identifier for mobile pairing |
| `NEXT_PUBLIC_NFT_CONTRACT_ADDRESS` | Public ClassNFT collection address |
| `NEXT_PUBLIC_IPFS_GATEWAY_URL` | Public HTTPS gateway base ending in `/ipfs/` |
| `CHAINLINK_ETH_USD_FEED_ADDRESS` | Chainlink Sepolia ETH/USD aggregator address |
| `UPSTASH_REDIS_REST_URL` | Server-only distributed upload-limit endpoint; required on Vercel |
| `UPSTASH_REDIS_REST_TOKEN` | Server-only upload-limit credential; required on Vercel |

Why does the Pinata key stay on the server? The key authorizes uploads to our Pinata account, so only the server route uses it. The browser sends the artwork and a signed upload authorization, and receives public IPFS URIs rather than credentials. If a key named with the `NEXT_PUBLIC_` prefix were referenced in client code, Next.js could embed it in the JavaScript sent to visitors. Anyone could then extract it and abuse its granted permissions, consume storage, or create charges.

## Contracts

- [ClassNFT on Sepolia](https://sepolia.etherscan.io/address/0x3fb98718010365fc227eb09e1af85988991b2ad1): `mint(string)`, `totalMinted()`, `ownerOf(uint256)`, `tokenURI(uint256)`. Minting is free and always sends to the signing wallet. IDs start at zero. No new Solidity contract is required.
- [Deployment transaction](https://sepolia.etherscan.io/tx/0x145929ab33a67b987279a19fa8bbecf5303a0f25809b6b350581dba84c0a412b).
- [Chainlink ETH/USD feed on Sepolia](https://sepolia.etherscan.io/address/0x694AA1769357215DE4FAC081bf1f309aDC325306): `decimals()` and `latestRoundData()`.
- [ENS registry on Ethereum mainnet](https://etherscan.io/address/0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e): ENS resolution is performed through viem's mainnet ENS support, with forward verification of reverse names. Resolver contracts depend on the name.

Sepolia chain ID is 11155111. ENS reads use mainnet without switching the wallet to mainnet.

## How it works

1. Connect an injected browser wallet or WalletConnect mobile wallet.
2. Select an image, write its title, and optionally add a description.
3. Sign a free upload authorization. Its content digest binds the image, title and description; the server checks the signature and five-minute validity window.
4. The server checks size and image signature, rate-limits each wallet to ten attempts per hour, prevents authorization replay, uploads the image to Pinata's public IPFS network, then uploads metadata referencing it.
5. Review the gas estimate, then sign the Sepolia mint transaction. Its token URI is the `ipfs://` metadata URI.
6. Wait for confirmation and follow the NFT detail link. Gallery data is re-read from the contract; metadata and artwork are loaded from IPFS.

The gallery paginates nine token IDs per page using `totalMinted()`. It reads the current owner, so transfers are reflected on refresh. Missing or malformed metadata does not replace onchain ownership with invented data.

The Chainlink price is fetched every 30 seconds while the tab is active and on focus. Oracle update age and last fetch age are shown separately; polling does not force the oracle to publish a new price. Prices older than four hours are marked stale and excluded from gas conversion. This threshold is an explicit application policy and should be reviewed against the selected feed's heartbeat before production use. The class contract has zero mint payment, so cards correctly show zero ETH and zero USD; this is not an NFT appraisal. Gas estimates and confirmed gas charges are converted using the current ETH price. Sepolia ETH is test currency, so USD figures are reference equivalents.

## Folder map

- `src/app`: studio, gallery, NFT details, global layout and styling.
- `src/app/api`: ENS lookup, Chainlink price, collection reads, protected Pinata uploads.
- `src/components`: wallet dialog, artwork cards, mint flow, ENS lookup and price strip.
- `src/hooks`: shared query caching and refresh behavior.
- `src/lib/contracts`: minimal ABI definitions for existing contracts.
- `src/lib/server`: server-only clients, Pinata access, metadata reads and upload limits.
- `tests`: IPFS URL validation, image signatures and signed-upload integrity checks.

## Deploy to Vercel

1. Push this project to a GitHub repository after checking for secrets.
2. Import that repository in Vercel, select Next.js, and set Root Directory to `frontend` and Node.js to 22.x.
3. Add environment variables in the Vercel dashboard. Configure Pinata, dedicated RPC endpoints, WalletConnect and Upstash. A wallet secret is never needed.
4. Add the production domain to the WalletConnect project's allowed origins. For additional abuse protection, enable Vercel firewall rate limits on `/api/upload`; wallet limits alone do not stop users creating many wallets.
5. Deploy. Ensure production deployment protection permits the mentor to access the URL without signing into Vercel.
6. Complete the phone checklist below and replace the deployment status above with the real URL.

Uploads are limited to 3 MB, leaving room for multipart overhead below Vercel's function payload limit. The upload route uses the Node runtime and a 60-second maximum duration. In local development only, upload limits can use process memory; Vercel deployments require Redis so limits and replay protection survive separate function instances. Uploaded files are public; do not upload private information. Pinning provides persistence while maintained by the Pinata account, not an unconditional promise of permanent availability.

## End-to-end acceptance checklist

- [ ] Public production link opens on a phone without a Vercel login.
- [ ] Wallet connects in a wallet browser and through WalletConnect in a normal mobile browser.
- [ ] Wrong-network wallet can switch to Sepolia.
- [ ] A valid `.eth` name resolves; invalid and unregistered names show helpful errors.
- [ ] Verified primary ENS names appear for owners and connected accounts where configured.
- [ ] An image uploads through `/api/upload`; no Pinata credential appears in browser requests or bundles.
- [ ] Rejecting mint preserves the uploaded URI for retry.
- [ ] A real mint confirms; `tokenURI` reads back the expected IPFS metadata URI.
- [ ] A fresh browser session finds the NFT and loads its image from IPFS.
- [ ] Price reads refresh automatically; a new oracle round updates the displayed price without reloading.
- [ ] USD gas figures use the live feed and unavailable/stale values are labelled honestly.
- [ ] Oversized and invalid images, rejected signatures, insufficient gas and provider failures are handled.
- [ ] Required Git-history check returns no matches and a broader secret scan passes.

Run the mentor's history command from the repository root (as provided in the assignment). Avoid putting the literal secret-assignment search pattern in a committed file, because that would match itself. A clean current file tree cannot establish that old Git history never contained a secret. Check the submission repository history before final handoff, including every earlier commit.

## Verification limits

The signed upload flow currently supports ordinary EOA wallet signatures; contract-wallet signature formats are not accepted. A successful build is not an end-to-end mint test. Live Pinata, mobile wallet signing, production deployment and real transaction confirmation need configured services and a funded test wallet. No private keys are stored or requested.

## Local verification completed

- Production build and TypeScript checks pass.
- Three validation tests pass, including changed-content signature rejection.
- Browser checks pass at desktop and phone widths, without horizontal overflow or runtime errors.
- Automatic price refresh passes with controlled API responses; this is not evidence of a real oracle price change during the test.
- Live RPC checks confirm successful contract deployment, the collection name, zero minted tokens, ENS resolution, and a valid Chainlink round. Public RPCs can fail transiently; the interface supports retry.
- The dependency installation audit reports zero vulnerabilities.
- The assignment's very short JWT-prefix scan matches a non-secret substring in the `big.js` package integrity checksum in `package-lock.json`. Do not remove or falsify integrity data to hide it. A literal zero-match result is therefore not yet satisfied; review this false positive with the mentor. No credential patterns were found in the files prepared for the initial commit; local environment files are excluded from version control.

Real Pinata upload/mint, WalletConnect mobile pairing, and Vercel deployment remain unverified until services and a test wallet are configured.
