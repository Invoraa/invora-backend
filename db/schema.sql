-- Invora Database Schema
-- Run this against your Neon Postgres database

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS invoices (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  invoice_number TEXT NOT NULL UNIQUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_date      TIMESTAMPTZ NOT NULL,
  status        TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','pending','in_escrow','partially_paid','paid','disputed','cancelled')),
  sender_address   TEXT NOT NULL,
  sender_name      TEXT,
  sender_email     TEXT,
  recipient_address TEXT NOT NULL,
  recipient_name    TEXT NOT NULL,
  recipient_email   TEXT,
  currency      TEXT NOT NULL DEFAULT 'USDC' CHECK (currency IN ('USDC','XLM')),
  total_amount  NUMERIC(20,7) NOT NULL,
  contract_address TEXT,
  tx_hash       TEXT,
  notes         TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  invoice_id  TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity    NUMERIC(10,2) NOT NULL,
  unit_price  NUMERIC(20,7) NOT NULL,
  total       NUMERIC(20,7) NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS milestones (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  invoice_id  TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  amount      NUMERIC(20,7) NOT NULL,
  due_date    TIMESTAMPTZ NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','completed','released')),
  tx_hash     TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_sender    ON invoices(sender_address);
CREATE INDEX IF NOT EXISTS idx_invoices_recipient ON invoices(recipient_address);
CREATE INDEX IF NOT EXISTS idx_invoices_status    ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_items_invoice      ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_milestones_invoice ON milestones(invoice_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_invoices_updated_at ON invoices;
CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();