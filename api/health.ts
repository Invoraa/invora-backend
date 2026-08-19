import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "../lib/db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const checks: Record<string, "ok" | "error"> = {};

  // DB check
  try {
    await sql`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  const allOk = Object.values(checks).every((v) => v === "ok");
  return res.status(allOk ? 200 : 503).json({
    status: allOk ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    network: process.env.STELLAR_NETWORK ?? "testnet",
    checks,
  });
}