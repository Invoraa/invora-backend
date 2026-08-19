import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getInvoiceById, updateInvoiceStatus } from "../../lib/db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", process.env.FRONTEND_URL ?? "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { id } = req.query;
  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Invoice ID required" });
  }

  try {
    if (req.method === "GET") {
      const invoice = await getInvoiceById(id);
      if (!invoice) return res.status(404).json({ error: "Invoice not found" });
      return res.status(200).json({ invoice });
    }

    if (req.method === "PATCH") {
      const { status, txHash, contractAddress } = req.body ?? {};
      if (!status) return res.status(400).json({ error: "status required" });
      const updated = await updateInvoiceStatus(id, status, txHash, contractAddress);
      return res.status(200).json({ invoice: updated[0] });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("Invoice by ID error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}