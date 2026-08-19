import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { createInvoice, getInvoicesByAddress, runMigrations } from "../../lib/db";

const CreateInvoiceSchema = z.object({
  senderAddress: z.string().length(56),
  senderName: z.string().optional(),
  senderEmail: z.string().email().optional(),
  recipientAddress: z.string().length(56),
  recipientName: z.string().min(1),
  recipientEmail: z.string().email().optional(),
  items: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().positive(),
    unitPrice: z.string(),
  })).min(1),
  currency: z.enum(["USDC", "XLM"]),
  dueDate: z.string(),
  notes: z.string().optional(),
  milestones: z.array(z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    amount: z.string(),
    dueDate: z.string(),
  })).optional(),
});

function setCors(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", process.env.FRONTEND_URL ?? "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function generateInvoiceNumber(): string {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `INV-${y}${m}-${rand}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    await runMigrations();

    if (req.method === "GET") {
      const { address } = req.query;
      if (!address || typeof address !== "string") {
        return res.status(400).json({ error: "address query param required" });
      }
      const invoices = await getInvoicesByAddress(address);
      return res.status(200).json({ invoices, total: invoices.length });
    }

    if (req.method === "POST") {
      const parsed = CreateInvoiceSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
      }

      const data = parsed.data;
      const items = data.items.map((item) => ({
        ...item,
        total: (item.quantity * parseFloat(item.unitPrice)).toFixed(7),
      }));
      const totalAmount = items
        .reduce((sum, item) => sum + parseFloat(item.total), 0)
        .toFixed(7);

      const invoice = await createInvoice({
        id: generateId(),
        invoiceNumber: generateInvoiceNumber(),
        dueDate: data.dueDate,
        senderAddress: data.senderAddress,
        senderName: data.senderName,
        senderEmail: data.senderEmail,
        recipientAddress: data.recipientAddress,
        recipientName: data.recipientName,
        recipientEmail: data.recipientEmail,
        currency: data.currency,
        totalAmount,
        notes: data.notes,
        items,
        milestones: data.milestones,
      });

      return res.status(201).json({ invoice });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: unknown) {
    console.error("Invoices handler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}