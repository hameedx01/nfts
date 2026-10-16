import test from "node:test";
import assert from "node:assert/strict";
import { describeSmartAccountError } from "../src/lib/smart-account-errors";
test("shows server explanation instead of generic viem error and calldata", () => {
  const error = Object.assign(
    new Error(
      "Missing or invalid parameters.\nRequest Arguments: callData: 0x1234",
    ),
    {
      cause: { details: "Studio: Sepolia could not verify your Safe account." },
    },
  );
  assert.equal(
    describeSmartAccountError(error),
    "Sepolia could not verify your Safe account.",
  );
});
test("distinguishes sponsorship refusal from wallet rejection", () => {
  assert.equal(
    describeSmartAccountError({
      cause: { details: "Studio: Sponsorship was declined." },
    }),
    "Sponsorship was declined.",
  );
  assert.match(
    describeSmartAccountError({ cause: { code: 4001 } }),
    /You declined/,
  );
});
test("removes encoded request arguments and handles cyclic causes", () => {
  const error = Object.assign(
    new Error("Request failed.\nRequest Arguments: callData: 0x1234"),
    { cause: null as unknown },
  );
  error.cause = error;
  assert.equal(describeSmartAccountError(error), "Request failed.");
});
