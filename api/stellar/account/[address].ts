import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Horizon } from "@stellar/stellar-sdk";

const HORIZON_URL =
  process.env.STELLAR_NETWORK === "mainnet"
    ? "https://horizon.stellar.org"
    : "https://horizon-testnet.stellar.org";

const server = new Horizon.Server(HORIZON_URL);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", process.env.FRONTEND_URL ?? "*");

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { address } = req.query;

  if (!address || typeof address !== "string") {
    return res.status(400).json({ error: "Invalid Stellar address" });
  }

  try {
    const account = await server.loadAccount(address);
    return res.status(200).json({
      address: account.id,
      sequence: account.sequenceNumber(),
      balances: account.balances,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("Not Found")) {
      return res.status(404).json({ error: "Account not found on Stellar network" });
    }
    return res.status(500).json({ error: "Failed to fetch account" });
  }
}