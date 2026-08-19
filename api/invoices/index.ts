import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { nanoid } from "nanoid";

const CreateInvoiceSchema = z.object({
  senderAddress: z.string().min(56).max(56),
  recipientAddress: z.string().min(56).max(56),
  recipientName: z.string().min(1),
  items: z.array(
    z.object({
      description: z.string().min(1),
      quantity: z.number().positive(),
      unitPrice: z.string(),
    })
  ).min(1),
  currency: z.enum(["USDC", "XLM"]),
  dueDate: z.string(),
  notes: z.string().optional(),
  milestones: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      amount: z.string(),
      dueDate: z.string(),
    })
  ).optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", process.env.FRONTEND_URL ?? "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    // TODO: fetch from DB
    return res.status(200).json({ invoices: [], total: 0 });
  }

  if (req.method === "POST") {
    const parsed = CreateInvoiceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    }

    const data = parsed.data;
    const totalAmount = data.items
      .reduce((sum, item) => sum + item.quantity * parseFloat(item.unitPrice), 0)
      .toFixed(7);

    const invoice = {
      id: nanoid(),
      invoiceNumber: `INV-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: "draft",
      currency: data.currency,
      totalAmount,
      ...data,
    };

    // TODO: persist to database
    return res.status(201).json({ invoice });
  }

  return res.status(405).json({ error: "Method not allowed" });
}