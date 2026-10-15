import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchIpfsContent, fetchIpfsMetadata } from "../src/lib/ipfs-content";
import { ipfsProxyUrl } from "../src/lib/ipfs";
import { GET } from "../src/app/api/ipfs/route";
const cid = "bafkreicwukkzy736fye7se23htbxii2xadwlas7urnxh6ptkqhet3l47jy";

test("metadata and binary artwork use the configured gateway", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async (url: string, options: RequestInit) => {
      assert.equal(url, `https://example.mypinata.cloud/ipfs/${cid}`);
      assert.equal(options.cache, "no-store");
      return Response.json({ name: "Btc", image: `ipfs://${cid}` });
    },
  );
  assert.equal(
    (await fetchIpfsMetadata(`ipfs://${cid}`, "example.mypinata.cloud")).name,
    "Btc",
  );
  assert.equal(
    ipfsProxyUrl(`ipfs://${cid}`, "file"),
    `/api/ipfs?cid=${cid}&type=file`,
  );
  t.mock.restoreAll();
  const bytes = new Uint8Array([137, 80, 78, 71]);
  t.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response(bytes, { headers: { "Content-Type": "image/png" } }),
  );
  const oldHost = process.env.PINATA_GATEWAY_HOST;
  process.env.PINATA_GATEWAY_HOST = "example.mypinata.cloud";
  try {
    const response = await GET(
      new Request(`http://localhost/api/ipfs?cid=${cid}&type=file`),
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "image/png");
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()), bytes);
  } finally {
    if (oldHost === undefined) delete process.env.PINATA_GATEWAY_HOST;
    else process.env.PINATA_GATEWAY_HOST = oldHost;
  }
});

test("invalid CIDs and encoded traversal never reach a gateway", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => {
    throw new Error("must not fetch");
  });
  for (const query of [
    "cid=bad",
    `cid=${cid}&type=html`,
    `cid=${cid}&path=%252e%252e/secret`,
  ]) {
    assert.equal(
      (await GET(new Request(`http://localhost/api/ipfs?${query}`))).status,
      400,
    );
  }
  assert.equal(fetch.mock.callCount(), 0);
});

test("gateway failures, HTML, malformed metadata and oversized streams are rejected", async (t) => {
  for (const response of [
    new Response("rate limited", { status: 429 }),
    new Response("<html>blocked</html>", {
      headers: { "content-type": "text/html" },
    }),
    new Response("not json", {
      headers: { "content-type": "application/json" },
    }),
    Response.json(null),
    new Response("x".repeat(262145), {
      headers: { "content-type": "application/json" },
    }),
  ]) {
    t.mock.method(globalThis, "fetch", async () => response);
    await assert.rejects(
      fetchIpfsMetadata(`ipfs://${cid}`, "example.mypinata.cloud"),
    );
    t.mock.restoreAll();
  }
  t.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response("<svg/>", { headers: { "content-type": "image/svg+xml" } }),
  );
  await assert.rejects(
    fetchIpfsContent(`ipfs://${cid}`, "example.mypinata.cloud", "file"),
  );
});
