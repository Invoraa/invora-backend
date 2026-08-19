import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { updateInvoiceStatus } from "../../lib/db";

const FundEscrowSchema = z.object({
  invoiceId: z.string(),
  payerAddress: z.string().length(56),
  amount: z.string(),
  currency: z.enum(["USDC", "XLM"]),
  txHash: z.string(),
  contractAddress: z.string().optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", process.env.FRONTEND_URL ?? "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const parsed = FundEscrowSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }

  try {
    const { invoiceId, txHash, contractAddress } = parsed.data;
    await updateInvoiceStatus(invoiceId, "in_escrow", txHash, contractAddress);
    return res.status(200).json({ message: "Escrow funded", invoiceId, status: "in_escrow", txHash });
  } catch (err) {
    console.error("Escrow fund error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}