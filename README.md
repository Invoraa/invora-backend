# invora-backend

> On-chain invoice and payment platform — Serverless Backend API

Built with **Node.js**, **TypeScript**, and **Vercel Serverless Functions**. Integrates with **Stellar Horizon API** and **Soroban contracts**.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/invoices` | List all invoices |
| POST | `/api/invoices` | Create a new invoice |
| GET | `/api/invoices/:id` | Get invoice by ID |
| POST | `/api/escrow/fund` | Fund escrow for an invoice |
| POST | `/api/escrow/release` | Release escrow funds |
| GET | `/api/stellar/account/:address` | Fetch Stellar account balances |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 |
| Language | TypeScript |
| Deploy | Vercel Serverless Functions |
| Blockchain | Stellar Horizon API + Soroban |
| Validation | Zod |

## Getting Started

```bash
npm install
cp .env.example .env.local
npm run dev   # uses vercel dev
```

## Related Repos

- [invora-frontend](https://github.com/Invoraa/invora-frontend) — Next.js UI
- [invora-contracts](https://github.com/Invoraa/invora-contracts) — Soroban smart contracts

## Contributing

Open source under the MIT License. PRs welcome!