import { entryPoint07Address } from "viem/account-abstraction";
import { isHex, type Hex } from "viem";
import { validateMintBatch } from "@/lib/batch-mint";
import { consumePimlico } from "@/lib/server/limits";
import { validateStudioSender } from "@/lib/server/safe-account";
import { PublicError } from "@/lib/server/response";
export const runtime = "nodejs";
export const maxDuration = 30;
const methods = new Set([
  "pimlico_getUserOperationGasPrice",
  "eth_estimateUserOperationGas",
  "eth_sendUserOperation",
  "eth_getUserOperationReceipt",
  "pm_getPaymasterStubData",
  "pm_getPaymasterData",
]);
export async function POST(request: Request) {
  let id: string | number | null = null;
  try {
    if (request.headers.get("origin") !== new URL(request.url).origin)
      throw new PublicError("Same-origin requests only.", 403);
    if (Number(request.headers.get("content-length") || 0) > 32768)
      throw new PublicError("Request too large.", 413);
    const raw = await request.text();
    if (raw.length > 32768) throw new PublicError("Request too large.", 413);
    const body = JSON.parse(raw);
    if (
      !body ||
      Array.isArray(body) ||
      body.jsonrpc !== "2.0" ||
      !methods.has(body.method) ||
      (body.params !== undefined && !Array.isArray(body.params))
    )
      throw new PublicError("Unsupported account request.");
    id =
      typeof body.id === "string" || typeof body.id === "number"
        ? body.id
        : null;
    await consumePimlico(
      request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
        "local",
    );
    const params = [...(body.params || [])];
    if (body.method === "pimlico_getUserOperationGasPrice") {
      if (params.length) throw new PublicError("Invalid fee request.");
    } else if (body.method === "eth_getUserOperationReceipt") {
      if (params.length !== 1 || !/^0x[0-9a-fA-F]{64}$/.test(params[0]))
        throw new PublicError("Invalid operation hash.");
    } else {
      if (String(params[1]).toLowerCase() !== entryPoint07Address.toLowerCase())
        throw new PublicError("Unsupported EntryPoint.");
      if (!params[0] || !isHex(params[0].callData))
        throw new PublicError("Missing batch data.");
      try {
        validateMintBatch(params[0].callData as Hex);
      } catch {
        throw new PublicError(
          "Only two zero-value mints of the same uploaded artwork are supported.",
        );
      }
      await validateStudioSender(
        request.headers.get("x-studio-owner"),
        params[0],
      );
      for (const field of [
        "callGasLimit",
        "verificationGasLimit",
        "preVerificationGas",
        "paymasterVerificationGasLimit",
        "paymasterPostOpGasLimit",
      ]) {
        if (params[0][field] && BigInt(params[0][field]) > 5000000n)
          throw new PublicError("Operation exceeds the studio gas limit.");
      }
      if (body.method.startsWith("pm_")) {
        if (params[2] !== "0xaa36a7")
          throw new PublicError("Only Sepolia sponsorship is supported.");
        const policy = process.env.PIMLICO_SPONSORSHIP_POLICY_ID;
        if (!policy)
          throw new PublicError(
            "The studio sponsorship policy is not configured.",
            503,
          );
        params[3] = { sponsorshipPolicyId: policy };
        params.length = 4;
      } else {
        params.length = 2;
      }
    }
    const key = process.env.PIMLICO_API_KEY;
    if (!key)
      throw new PublicError(
        "Smart-account minting is available on the configured Vercel deployment.",
        503,
      );
    const response = await fetch(
      `https://api.pimlico.io/v2/sepolia/rpc?apikey=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id,
          method: body.method,
          params,
        }),
        signal: AbortSignal.timeout(25000),
        cache: "no-store",
      },
    );
    if (!response.ok)
      throw new PublicError(
        "Pimlico is unavailable or its credentials need checking.",
        502,
      );
    const result = await response.json();
    // Never forward upstream errors: they can contain credentials or request URLs.
    if (result.error)
      throw new PublicError(
        body.method.startsWith("pm_")
          ? "Sponsorship was declined. Check the policy, Sepolia eligibility and limits in Pimlico."
          : "The account request failed. Check the operation in Pimlico before trying again.",
        502,
      );
    return Response.json(
      { jsonrpc: "2.0", id, result: result.result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      {
        jsonrpc: "2.0",
        id,
        error: {
          code: -32000,
          message:
            error instanceof PublicError
              ? error.message
              : "Invalid or unavailable account request.",
        },
      },
      {
        status: error instanceof PublicError ? error.status : 400,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
