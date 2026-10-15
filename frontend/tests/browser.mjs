import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";

const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch({ channel: "chrome", headless: true });
await mkdir("test-results", { recursive: true });
const errors = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(base, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: /Make something/ }).waitFor();
  await page.screenshot({
    path: "test-results/studio-desktop.png",
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
    "Desktop must not overflow",
  );
  await page.getByRole("button", { name: "Connect wallet" }).first().click();
  assert.equal(
    await page.getByRole("dialog", { name: "Wallet connection" }).isVisible(),
    true,
  );
  await page.keyboard.press("Escape");
  assert.equal(
    await page.getByRole("dialog", { name: "Wallet connection" }).count(),
    0,
  );
  await page.locator("#artwork-file").setInputFiles({
    name: "bad.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from("<svg/>"),
  });
  assert.match(
    await page.locator(".error-notice").innerText(),
    /PNG, JPEG, or WebP/,
  );
  await page.locator("#artwork-file").setInputFiles({
    name: "pixel.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1ioAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  assert.equal(
    await page.getByAltText("Your artwork preview").isVisible(),
    true,
  );
  await page.getByRole("button", { name: "Remove selected image" }).click();
  await page.getByLabel("Find an Ethereum identity").fill("not-a-name");
  await page.getByRole("button", { name: "Look up ENS name" }).click();
  await page.getByText("Enter a .eth name or an Ethereum address.").waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base, { waitUntil: "networkidle" });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
    "Phone must not overflow",
  );
  await page.screenshot({
    path: "test-results/studio-mobile.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "The collection", exact: true }).click();
  await page.waitForURL("**/gallery");
  await page
    .getByRole("heading", { name: "Made here. Kept forever." })
    .waitFor();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
    "Mobile gallery must not overflow",
  );
  await page.screenshot({
    path: "test-results/gallery-mobile.png",
    fullPage: true,
  });
  await page.goto(base + "/nft/not-a-token");
  await page
    .getByRole("heading", { name: "This edition couldn’t be loaded." })
    .waitFor();
  console.log(
    "PASS: desktop and mobile rendering, wallet dialog, image validation, ENS error, navigation, invalid NFT",
  );

  const isolated = await browser.newPage();
  let reads = 0;
  await isolated.route("**/api/price", (route) =>
    route.fulfill({
      json: {
        price: ++reads === 1 ? 2000 : 2100,
        updatedAt: Math.floor(Date.now() / 1000),
        fetchedAt: Math.floor(Date.now() / 1000),
        roundId: String(reads),
        stale: false,
      },
    }),
  );
  await isolated.route("**/api/nfts*", (route) =>
    route.fulfill({ json: { items: [], total: "0", hasMore: false } }),
  );
  await isolated.clock.install();
  await isolated.goto(base);
  await isolated.getByText("$2,000.00", { exact: true }).waitFor();
  await isolated.clock.fastForward(31000);
  await isolated.getByText("$2,100.00", { exact: true }).waitFor();
  assert.ok(reads >= 2);
  console.log("PASS: automatic price refresh (controlled response, no reload)");
  assert.deepEqual(errors, [], "No browser runtime errors");
  console.log("PASS: no browser runtime errors");
} finally {
  await browser.close();
}
