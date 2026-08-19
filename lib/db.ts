import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

export const sql = neon(process.env.DATABASE_URL);

// ── Invoice helpers ──────────────────────────────────────────────

export async function createInvoice(data: {
  id: string;
  invoiceNumber: string;
  dueDate: string;
  senderAddress: string;
  senderName?: string;
  senderEmail?: string;
  recipientAddress: string;
  recipientName: string;
  recipientEmail?: string;
  currency: "USDC" | "XLM";
  totalAmount: string;
  notes?: string;
  items: Array<{ description: string; quantity: number; unitPrice: string; total: string }>;
  milestones?: Array<{ title: string; description?: string; amount: string; dueDate: string }>;
}) {
  // Insert invoice
  await sql`
    INSERT INTO invoices (
      id, invoice_number, due_date, sender_address, sender_name, sender_email,
      recipient_address, recipient_name, recipient_email,
      currency, total_amount, notes
    ) VALUES (
      ${data.id}, ${data.invoiceNumber}, ${data.dueDate},
      ${data.senderAddress}, ${data.senderName ?? null}, ${data.senderEmail ?? null},
      ${data.recipientAddress}, ${data.recipientName}, ${data.recipientEmail ?? null},
      ${data.currency}, ${data.totalAmount}, ${data.notes ?? null}
    )
  `;

  // Insert items
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];
    await sql`
      INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total, sort_order)
      VALUES (${data.id}, ${item.description}, ${item.quantity}, ${item.unitPrice}, ${item.total}, ${i})
    `;
  }

  // Insert milestones if provided
  if (data.milestones) {
    for (let i = 0; i < data.milestones.length; i++) {
      const m = data.milestones[i];
      await sql`
        INSERT INTO milestones (invoice_id, title, description, amount, due_date, sort_order)
        VALUES (${data.id}, ${m.title}, ${m.description ?? null}, ${m.amount}, ${m.dueDate}, ${i})
      `;
    }
  }

  return getInvoiceById(data.id);
}

export async function getInvoiceById(id: string) {
  const rows = await sql`
    SELECT i.*,
      json_agg(DISTINCT jsonb_build_object(
        'id', ii.id, 'description', ii.description,
        'quantity', ii.quantity, 'unitPrice', ii.unit_price,
        'total', ii.total, 'sortOrder', ii.sort_order
      )) FILTER (WHERE ii.id IS NOT NULL) AS items,
      json_agg(DISTINCT jsonb_build_object(
        'id', m.id, 'title', m.title, 'description', m.description,
        'amount', m.amount, 'dueDate', m.due_date,
        'status', m.status, 'txHash', m.tx_hash
      )) FILTER (WHERE m.id IS NOT NULL) AS milestones
    FROM invoices i
    LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
    LEFT JOIN milestones m ON m.invoice_id = i.id
    WHERE i.id = ${id}
    GROUP BY i.id
  `;
  return rows[0] ?? null;
}

export async function getInvoicesByAddress(address: string) {
  return sql`
    SELECT i.*, COUNT(ii.id) as item_count
    FROM invoices i
    LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
    WHERE i.sender_address = ${address} OR i.recipient_address = ${address}
    GROUP BY i.id
    ORDER BY i.created_at DESC
  `;
}

export async function updateInvoiceStatus(
  id: string,
  status: string,
  txHash?: string,
  contractAddress?: string
) {
  return sql`
    UPDATE invoices
    SET status = ${status},
        tx_hash = COALESCE(${txHash ?? null}, tx_hash),
        contract_address = COALESCE(${contractAddress ?? null}, contract_address)
    WHERE id = ${id}
    RETURNING *
  `;
}

export async function runMigrations() {
  // Ensures schema is applied — safe to call on cold start
  await sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`;
  await sql`
    CREATE TABLE IF NOT EXISTS invoices (
      id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      invoice_number TEXT NOT NULL UNIQUE,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      due_date      TIMESTAMPTZ NOT NULL,
      status        TEXT NOT NULL DEFAULT 'draft',
      sender_address   TEXT NOT NULL,
      sender_name      TEXT,
      sender_email     TEXT,
      recipient_address TEXT NOT NULL,
      recipient_name    TEXT NOT NULL,
      recipient_email   TEXT,
      currency      TEXT NOT NULL DEFAULT 'USDC',
      total_amount  NUMERIC(20,7) NOT NULL,
      contract_address TEXT,
      tx_hash       TEXT,
      notes         TEXT,
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      invoice_id  TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      quantity    NUMERIC(10,2) NOT NULL,
      unit_price  NUMERIC(20,7) NOT NULL,
      total       NUMERIC(20,7) NOT NULL,
      sort_order  INTEGER NOT NULL DEFAULT 0
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS milestones (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      invoice_id  TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      title       TEXT NOT NULL,
      description TEXT,
      amount      NUMERIC(20,7) NOT NULL,
      due_date    TIMESTAMPTZ NOT NULL,
      status      TEXT NOT NULL DEFAULT 'pending',
      tx_hash     TEXT,
      sort_order  INTEGER NOT NULL DEFAULT 0
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_invoices_sender ON invoices(sender_address)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_invoices_recipient ON invoices(recipient_address)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_items_invoice ON invoice_items(invoice_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_milestones_invoice ON milestones(invoice_id)`;
}