import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { updateInvoiceStatus } from "../../lib/db";

const ReleaseEscrowSchema = z.object({
  invoiceId: z.string(),
  milestoneId: z.string().optional(),
  senderAddress: z.string().length(56),
  txHash: z.string(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", process.env.FRONTEND_URL ?? "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const parsed = ReleaseEscrowSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }

  try {
    const { invoiceId, txHash } = parsed.data;
    await updateInvoiceStatus(invoiceId, "paid", txHash);
    return res.status(200).json({
      message: "Escrow released successfully",
      invoiceId,
      status: "paid",
      txHash,
    });
  } catch (err) {
    console.error("Escrow release error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}