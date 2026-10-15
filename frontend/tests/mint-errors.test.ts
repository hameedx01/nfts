import { test } from "node:test";
import assert from "node:assert/strict";
import { UserRejectedRequestError } from "viem";
import { describeMintError } from "../src/lib/mint-errors";
import { pinataErrorMessage } from "../src/lib/pinata-errors";

test("every Pinata response remains visible instead of becoming a wallet error", () => {
  for (const status of [400, 401, 402, 403, 413, 422, 429, 500, 503]) {
    const message = pinataErrorMessage(status);
    assert.equal(describeMintError(new Error(message)), message);
  }
});

test("actual wallet rejections are recognized through nested causes", () => {
  const rejection = new UserRejectedRequestError(new Error("User rejected"));
  assert.match(describeMintError(rejection), /You declined/);
  assert.match(
    describeMintError(new Error("Signing failed", { cause: rejection })),
    /You declined/,
  );
  assert.match(describeMintError({ code: 4001 }), /You declined/);
});

test("unknown and cyclic errors terminate safely", () => {
  const error = new Error("Upload failed") as Error & { cause?: unknown };
  error.cause = error;
  assert.equal(describeMintError(error), "Upload failed");
  assert.match(describeMintError(null), /try again/);
});
