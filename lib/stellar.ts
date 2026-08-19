import {
  Horizon,
  TransactionBuilder,
  Networks,
  Operation,
  Asset,
  Memo,
  BASE_FEE,
} from "@stellar/stellar-sdk";

export const NETWORK = process.env.STELLAR_NETWORK ?? "testnet";
export const HORIZON_URL =
  NETWORK === "mainnet"
    ? "https://horizon.stellar.org"
    : "https://horizon-testnet.stellar.org";
export const NETWORK_PASSPHRASE =
  NETWORK === "mainnet" ? Networks.PUBLIC : Networks.TESTNET;

export const server = new Horizon.Server(HORIZON_URL);

// USDC on Stellar testnet (Circle issuer)
export const USDC_ASSET = new Asset(
  "USDC",
  NETWORK === "mainnet"
    ? "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"
    : "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"
);

/**
 * Build an unsigned payment transaction XDR.
 * The client wallet signs and submits it.
 */
export async function buildPaymentTx(opts: {
  senderAddress: string;
  destinationAddress: string;
  amount: string;
  currency: "USDC" | "XLM";
  memo?: string;
}): Promise<string> {
  const account = await server.loadAccount(opts.senderAddress);
  const asset = opts.currency === "USDC" ? USDC_ASSET : Asset.native();

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.payment({
        destination: opts.destinationAddress,
        asset,
        amount: opts.amount,
      })
    )
    .addMemo(opts.memo ? Memo.text(opts.memo.slice(0, 28)) : Memo.none())
    .setTimeout(300)
    .build();

  return tx.toXDR();
}

/**
 * Submit a signed transaction XDR to the Stellar network.
 */
export async function submitTransaction(signedXdr: string) {
  const { TransactionBuilder: TB } = await import("@stellar/stellar-sdk");
  const tx = TB.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  return server.submitTransaction(tx);
}

/**
 * Check if an account has a USDC trustline established.
 */
export async function hasUsdcTrustline(address: string): Promise<boolean> {
  try {
    const account = await server.loadAccount(address);
    return account.balances.some(
      (b) =>
        b.asset_type === "credit_alphanum4" &&
        (b as Horizon.HorizonApi.BalanceLine<"credit_alphanum4">).asset_code === "USDC"
    );
  } catch {
    return false;
  }
}

/**
 * Get all balances for an account.
 */
export async function getAccountBalances(address: string) {
  const account = await server.loadAccount(address);
  return account.balances;
}

/**
 * Format a Stellar amount string for display.
 */
export function formatAmount(amount: string, decimals = 2): string {
  return parseFloat(amount).toFixed(decimals);
}