import { test } from "node:test";
import assert from "node:assert/strict";
import { privateKeyToAccount } from "viem/accounts";
import { generatePrivateKey } from "viem/accounts";
import { verifyMessage } from "viem";
import { contentDigest, imageType, uploadMessage } from "../src/lib/upload";
import { ipfsUrl } from "../src/lib/ipfs";

test("only IPFS content can become a gateway URL", () => {
  assert.equal(
    ipfsUrl("ipfs://Qm" + "a".repeat(44)),
    "https://ipfs.io/ipfs/Qm" + "a".repeat(44),
  );
  for (const uri of [
    "http://127.0.0.1",
    "https://example.com",
    "ipfs://abc",
    "ipfs://" + "a".repeat(46) + "/../secret",
    "javascript:alert(1)",
  ])
    assert.throws(() => ipfsUrl(uri));
});
test("image type uses file bytes rather than a supplied MIME label", () => {
  assert.equal(
    imageType(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])),
    "image/png",
  );
  assert.equal(imageType(new Uint8Array([255, 216, 255])), "image/jpeg");
  assert.equal(
    imageType(new TextEncoder().encode("RIFF0000WEBP")),
    "image/webp",
  );
  assert.equal(
    imageType(new TextEncoder().encode('<svg onload="alert(1)">')),
    null,
  );
});
test("upload authorization binds artwork, title, story, wallet and timestamp", async () => {
  const wallet = privateKeyToAccount(generatePrivateKey());
  const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]).buffer;
  const digest = await contentDigest(bytes, "Original", "My story");
  const timestamp = String(Date.now());
  const message = uploadMessage(wallet.address, digest, timestamp);
  const signature = await wallet.signMessage({ message });
  assert.equal(
    await verifyMessage({ address: wallet.address, message, signature }),
    true,
  );
  const changed = await contentDigest(bytes, "Changed", "My story");
  assert.notEqual(changed, digest);
  assert.equal(
    await verifyMessage({
      address: wallet.address,
      message: uploadMessage(wallet.address, changed, timestamp),
      signature,
    }),
    false,
  );
  assert.notEqual(
    await contentDigest(bytes, "Original", "Different story"),
    digest,
  );
  assert.notEqual(
    await contentDigest(new Uint8Array([0]).buffer, "Original", "My story"),
    digest,
  );
});
