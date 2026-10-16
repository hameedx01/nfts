import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  let fail = false,
    minted = false;
  const nft = {
    id: "3",
    owner: "0x1111111111111111111111111111111111111111",
    uri: "ipfs://test",
    name: "Existing edition",
    description: "",
    image: null,
  };
  await page.route("**/api/nfts*", (route) =>
    fail
      ? route.fulfill({
          status: 502,
          json: { error: "RPC temporarily unavailable" },
        })
      : route.fulfill({
          json: {
            items: minted
              ? [{ ...nft, id: "4", name: "New edition" }, nft]
              : [nft],
            total: minted ? "2" : "1",
            hasMore: false,
          },
        }),
  );
  await page.route("**/api/ens*", (route) =>
    route.fulfill({ json: { name: null, address: nft.owner } }),
  );
  await page.route("**/api/price", (route) =>
    route.fulfill({
      json: {
        price: 2000,
        updatedAt: Math.floor(Date.now() / 1000),
        stale: false,
      },
    }),
  );
  await page.clock.install();
  await page.goto(
    (process.env.TEST_BASE_URL || "http://127.0.0.1:3001") + "/gallery",
  );
  await page.getByRole("heading", { name: "Existing edition" }).waitFor();
  minted = true;
  await page.clock.fastForward(16000);
  await page.getByRole("heading", { name: "New edition" }).waitFor();
  fail = true;
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  for (let i = 0; i < 4; i++) {
    await page.waitForTimeout(150);
    await page.clock.fastForward(6000);
  }
  await page.getByText(/Refresh interrupted/).waitFor();
  assert.equal(
    await page.getByRole("heading", { name: "New edition" }).isVisible(),
    true,
  );
  assert.equal(
    await page
      .getByRole("heading", { name: "We couldn’t reach the chain." })
      .count(),
    0,
  );
  fail = false;
  await page.clock.fastForward(16000);
  await page.waitForFunction(
    () => !document.body.textContent.includes("Refresh interrupted"),
  );
  console.log(
    "PASS: new mints refresh automatically; failed refresh keeps NFTs visible; retry recovers",
  );
} finally {
  await browser.close();
}
