import { test } from "node:test";
import assert from "node:assert/strict";
import { pinataErrorMessage } from "../src/lib/pinata-errors";

test("Pinata failures distinguish credentials, permissions and limits", () => {
  assert.match(pinataErrorMessage(401), /complete JWT/);
  assert.match(pinataErrorMessage(403), /permissions/);
  assert.match(pinataErrorMessage(402), /billing/);
  assert.match(pinataErrorMessage(413), /smaller image/);
  assert.match(pinataErrorMessage(429), /Wait a moment/);
  assert.match(pinataErrorMessage(503), /temporarily unavailable/);
  assert.match(pinataErrorMessage(422), /422/);
});
