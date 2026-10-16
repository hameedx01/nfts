import { chromium } from "playwright";
import assert from "node:assert/strict";
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  await context.addInitScript(() => {
    class MockNotification {
      static permission = "denied";
      static async requestPermission() {
        return "denied";
      }
    }
    Object.defineProperty(window, "Notification", { value: MockNotification });
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/ens?*", (route) =>
    route.fulfill({
      json: {
        name: "demo.eth",
        address: "0x1111111111111111111111111111111111111111",
      },
    }),
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
  let reads = 0;
  const events = [1, 2].map((id) => ({
    id: `0xabc:${id}`,
    transactionHash: `0x${"a".repeat(64)}`,
    blockNumber: "101",
    address: "0x1111111111111111111111111111111111111111",
    tokenId: String(id),
    uri: "ipfs://demo",
  }));
  await page.route("**/api/events*", (route) =>
    route.fulfill({
      json: !new URL(route.request().url()).searchParams.has("fromBlock")
        ? { nextBlock: "101", head: "100", events: [] }
        : { nextBlock: "102", head: "101", events },
    }),
  );
  await page.goto(base + "/alerts");
  await page.getByRole("heading", { name: "Live mint alerts." }).waitFor();
  await page
    .getByRole("button", { name: "Enable browser notifications" })
    .click();
  await page.getByText(/Notifications are blocked/).waitFor();
  await page.locator(".alert-card").first().waitFor();
  await page.waitForTimeout(4500);
  assert.equal(
    await page.locator(".alert-card").count(),
    2,
    "same-transaction events must stay distinct and duplicate polls must not repeat them",
  );
  assert.equal(await page.locator(".alert-toast").count(), 2);
  assert.equal(
    await page
      .locator(".alert-card")
      .getByText("demo.eth", { exact: true })
      .count(),
    2,
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.screenshot({
    path: "test-results/alerts-mobile.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: two events, deduplication, ENS display, notification denial fallback, mobile layout, no runtime errors (controlled event responses)",
  );
} finally {
  await browser.close();
}
