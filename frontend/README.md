# Edition Studio

A small NFT studio built for the Web3Bridge Day 3 assignment. Upload original artwork to public IPFS through a protected server route, mint it into the class collection on Sepolia, and browse editions with ENS owner names. Chainlink powers automatically refreshed ETH/USD reference prices and gas conversions.

**Deployment:** [Edition Studio](https://nfts-lime.vercel.app/) · [Live alerts](https://nfts-lime.vercel.app/alerts). Day 4 features are deployed; a confirmed sponsored batch and its Etherscan evidence are recorded below.

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
| `PINATA_GATEWAY_HOST` | Server-only Pinata gateway hostname used for metadata and artwork through `/api/ipfs` |
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

The gallery paginates nine token IDs per page using `totalMinted()`. Owner and token-URI reads are grouped into Multicall requests with Sepolia RPC fallback, and repeated metadata URIs are fetched once per response. The collection refreshes every 15 seconds while active and on reconnect/focus; a failed background refresh keeps the last loaded NFTs visible with a retry notice. It reads the current owner, so transfers are reflected on refresh. Missing or malformed metadata does not replace onchain ownership with invented data.

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

The Day 4 production deployment and real sponsored batch mint are verified below. WalletConnect mobile pairing remains a separate manual acceptance check.


## Day 4: smart-account batch mint

After uploading artwork, choose **Prepare smart account**, then **Mint 2 with smart account**. The connected EOA controls a Safe 1.4.1 account on Sepolia (EntryPoint v0.7, salt nonce 0). One `sendUserOperation` contains two zero-value `mint(uri)` calls to the existing ClassNFT; Safe MultiSendCallOnly executes both atomically. Both token IDs use the uploaded metadata and belong to the Safe, not directly to its owner EOA. The original single-wallet mint remains available.

The browser signs through the connected wallet; no private key is generated or stored by the app. Pimlico sponsors gas through the configured policy. Sponsorship failure is shown explicitly; the app does not silently charge the owner. The first operation also deploys the Safe when necessary. Pending operation hashes are saved per owner/collection in browser storage, so reconnecting and uploading artwork again allows a receipt check without resubmitting.

### Server configuration

Add `PIMLICO_API_KEY` and `PIMLICO_SPONSORSHIP_POLICY_ID` to **Vercel Environment Variables**, for Preview and Production. The policy ID is not the webhook secret. Keep the API key only in Vercel: do not add it to `.env.local`, commit it, pull it to disk with Vercel CLI, or prefix it with `NEXT_PUBLIC_`. Local smart-account submission deliberately reports missing configuration; use the Vercel deployment for the real transaction.

`/api/pimlico` authenticates upstream requests on the server, fixes the chain and EntryPoint, injects the server-selected sponsorship policy, and permits only the RPC methods this flow needs. It verifies the derived Safe sender and supplied deployment data, decodes both nested calls, rejects other contracts/functions/value transfers, and rate-limits through the existing Upstash configuration. Upstream errors are replaced with messages that cannot expose the API-key URL. Keep sponsorship policy budgets and per-user limits enabled; request checks and IP limits are not a substitute for a sponsorship budget.

### Verified UserOperation evidence

[View the successful UserOperation’s containing transaction on Sepolia Etherscan](https://sepolia.etherscan.io/tx/0x6c8acaa6c84ae423560056146d3b8f5874745dbd6e689df54b963e7b959aa25c).

Verified with Sepolia RPC: transaction status `success`, block `11926924`, and EntryPoint's `UserOperationEvent.success = true`. The same transaction contains two `Minted` events from our ClassNFT contract, for IDs **3 and 4**. Independent `ownerOf(3)` and `ownerOf(4)` reads both return the Safe below; both token URIs are `ipfs://bafkreihlx2u3dfoz3iwcwhm2ptkcosexo5y7h24qpjfmgppdspxd5drvda`.

| Evidence | Value |
| --- | --- |
| UserOperation hash | `0x4073fd8e7a7f2552b2179f2223a4aea9c0f602dde353774238cd9eb01ce6e1da` |
| Containing transaction hash | `0x6c8acaa6c84ae423560056146d3b8f5874745dbd6e689df54b963e7b959aa25c` |
| Smart account / UserOperation sender | `0xB59f6D467685BDFde24Fa342258f172Da67C17d8` |
| From: bundler EOA | `0x43370398500dae4ba10669646a1FD1577407F637` |
| To: EntryPoint | `0x0000000071727De22E5E9d8BAf0edAc6f37da032` |
| Sponsoring paymaster | `0x777777777777AeC03fd955926DbF81597e66834C` |
| UserOperation gas cost | `0.00034983287830012` Sepolia ETH (`349832878300120` wei) |
| Minted tokens | [Edition #3](https://nfts-lime.vercel.app/nft/3), [Edition #4](https://nfts-lime.vercel.app/nft/4) |

- **Who is in From?** Etherscan's outer transaction shows the bundler's EOA, `0x43370398500dae4ba10669646a1FD1577407F637`. The UserOperation sender is our Safe, `0xB59f6D467685BDFde24Fa342258f172Da67C17d8`; the owner wallet signed its instructions.
- **Who is in To?** The outer transaction targets EntryPoint, `0x0000000071727De22E5E9d8BAf0edAc6f37da032`. Through EntryPoint and its ERC-4337 module, the Safe executes two inner `mint(uri)` calls against [our ClassNFT contract](https://sepolia.etherscan.io/address/0x3fb98718010365fc227eb09e1af85988991b2ad1).
- **Who paid gas?** The receipt's `UserOperationEvent` identifies paymaster `0x777777777777AeC03fd955926DbF81597e66834C` as the sponsor. The bundler fronts the outer transaction fee and is compensated through EntryPoint from the paymaster's deposit; this operation's recorded charge is `0.00034983287830012` Sepolia ETH, not a gas payment from the owner's wallet. This is the UserOperation cost, which is distinct from the entire outer transaction's fee.

A UserOperation hash is distinct from its containing transaction hash; the Etherscan `/tx/` link above uses the transaction hash.

### Live alerts and ENS

`/alerts` reads the collection's `Minted` events every four seconds through `/api/events`. Initial recent events are shown without notifications; new events produce individual feed entries and in-page pop-ups, including both mints in a batch. Click **Enable browser notifications** to grant browser permission; a service worker displays notifications on supported browsers. Denied/unsupported notifications leave the visible feed and in-page pop-ups working.

Recipients resolve through the existing mainnet ENS endpoint, which verifies reverse names with a forward lookup. Addresses without a verified primary ENS name remain addresses; the owner's ENS identity is never substituted for the Safe's identity. An ENS-enabled recipient is required to demonstrate a real name. Logs are deduplicated by transaction hash and log index. The page retains a block cursor across transient failures and catches up in bounded ranges; it shows at most 100 entries. These are newly observed logs, not finality guarantees; a production indexer must reconcile reorganizations.

**Why does this only work while the page is open?** The page runs the polling loop, so closing it stops event detection; its notification service worker is not a background blockchain listener. A real product would use a persistent backend indexer or managed event service, store its block cursor and notification records, and handle retries, duplicate events, and reorganizations. It would send Web Push, email, or other subscribed notifications independently of the open page.

### Day 4 acceptance checks

- [x] Production `/alerts` and the smart-account controls are deployed (commit `4044175`). The live events endpoint and authenticated Pimlico fee request both returned HTTP 200.
- [x] One real sponsored UserOperation succeeds and emits two collection `Minted` events (IDs 3 and 4).
- [x] Both `ownerOf` reads return the Safe address.
- [x] The real Etherscan transaction, UserOperation hash, and gas-payment evidence are recorded above.
- [x] Owner confirmed the live feed displayed editions #3 and #4 and a browser notification or in-page pop-up during the real batch.
- [ ] Demonstrate a live recipient with a verified ENS name; name rendering is covered by controlled browser tests, and addresses without ENS use an address fallback.
- [x] Owner confirmed a live pop-up; automated Chrome checks cover denied-permission fallback and mobile layout. System-level notification delivery was not separately identified in the owner’s report.
- [x] Pimlico configuration is server-only; local Pimlico env entries were removed, and the inspected browser bundles contain neither the key variable nor the keyed upstream endpoint.


Local Day 4 verification: TypeScript and the production build passed; 17 unit tests passed, including batch restrictions, actual Safe SDK encoding, and readable account errors. Chrome checks passed for the existing studio and for two mocked mint events, duplicate suppression, verified-name rendering, denied-notification fallback, and mobile layout. Live wallet signing and the sponsored two-mint operation are verified above. The owner also confirmed both live events and a pop-up appeared for this batch. System-level notification delivery was not distinguished from the in-page pop-up, and a live ENS-named recipient remains unverified; controlled UI checks are not evidence of those specific live behaviors.
