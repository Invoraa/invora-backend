import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";

const ReleaseEscrowSchema = z.object({
  invoiceId: z.string(),
  milestoneId: z.string().optional(),
  senderAddress: z.string().min(56).max(56),
  signedXdr: z.string(),
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

  // TODO: Submit release tx and update invoice/milestone status
  return res.status(200).json({
    message: "Escrow release initiated",
    invoiceId: parsed.data.invoiceId,
    milestoneId: parsed.data.milestoneId ?? null,
    status: "released",
  });
}