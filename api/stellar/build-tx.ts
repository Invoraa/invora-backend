import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { buildPaymentTx } from "../../lib/stellar";

const BuildTxSchema = z.object({
  senderAddress: z.string().length(56),
  destinationAddress: z.string().length(56),
  amount: z.string(),
  currency: z.enum(["USDC", "XLM"]),
  memo: z.string().max(28).optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", process.env.FRONTEND_URL ?? "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const parsed = BuildTxSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }

  try {
    const xdr = await buildPaymentTx(parsed.data);
    return res.status(200).json({ xdr, network: process.env.STELLAR_NETWORK ?? "testnet" });
  } catch (err) {
    console.error("Build tx error:", err);
    return res.status(500).json({ error: "Failed to build transaction" });
  }
}