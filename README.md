# Zovi — B2B Marketplace

A B2B marketplace connecting verified buyers and suppliers, with escrow-protected
checkout, in-order messaging, and company verification against government
registries (AADE for Greece, VIES for the rest of the EU).

Built with Next.js 15 (App Router), PostgreSQL/Prisma, Redis, and Meilisearch.

## What's in here

**Three roles, one app:**
- **Buyer** — browse/search the marketplace, buy products (creates an escrow-backed
  order), chat with the supplier per-order, approve/reject freight quotes, mark
  orders delivered to release escrowed funds.
- **Supplier** — list products with image upload, manage stock, quote freight on
  incoming orders, chat with buyers, archive/restore/permanently delete products.
- **Super Admin** — KPI overview, fraud & communication audit feed (masked vs.
  unmasked chat content), escrow dispute queue. Mandatory 2FA, edge-middleware
  gated (`/admin/*` 404s for anyone without the role, hiding its existence).

**Security:**
- Argon2id password hashing, Redis-backed login rate limiting (5 attempts / 15 min)
- Mandatory TOTP 2FA for suppliers and admins, optional for buyers — enrollment
  happens on first login rather than blocking accounts that haven't set it up yet
- Company registration is verified against AADE (Greece) or VIES (EU) before an
  account is created
- In-order chat auto-masks phone numbers, emails, and IBANs before storage

**Commerce flow:**
1. Buyer purchases a product → order created, merchandise value held in escrow, stock decremented
2. Supplier reviews and submits a freight quote (or free shipping)
3. Buyer approves (order ships) or rejects (order cancelled, no penalty)
4. Buyer marks the order delivered → escrow releases to the supplier
5. Cancelled orders can be deleted once resolved; active vs. completed/cancelled
   are split into separate tabs so the dashboard doesn't fill up with old history

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript) |
| Database | PostgreSQL via Prisma ORM |
| Cache / sessions | Redis |
| Search | Meilisearch (typo-tolerant product search, falls back to Postgres if unreachable) |
| Auth | JWT sessions (jose), Argon2id, otplib (TOTP) |
| Images | Sharp (resize + WebP conversion on upload) |
| UI | Tailwind CSS v4, shadcn/ui (base-ui), Material Symbols |

## Getting started

Requires Docker (for Postgres/Redis/Meilisearch) and Node 20+.

```bash
# 1. Start local infra
docker compose up -d

# 2. Install dependencies
npm install

# 3. Copy env template and fill in secrets
cp .env.example .env

# 4. Push the schema and seed demo data
npx prisma db push
npm run db:seed

# 5. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo accounts (from `npm run db:seed`)

All use password `DemoPass123!`.

| Role | Email | 2FA |
|---|---|---|
| Buyer | `buyer@zovi.test` | none |
| Supplier | `supplier@zovi.test` | required (seeded secret — see `prisma/seed.ts`) |
| Admin | `admin@zovi.test` | required (seeded secret — see `prisma/seed.ts`) |

### Environment variables

See [`.env.example`](.env.example). Notably:
- `DATABASE_URL`, `REDIS_URL`, `MEILI_MASTER_KEY` — local infra, matches `docker-compose.yml`
- `AADE_API_USER` / `AADE_API_KEY` — Greek tax registry credentials for company verification (registration will correctly fail closed without these — no bypass)
- `VIES_API_URL` — EU VAT registry, no credentials needed (public endpoint)
- `VIVA_*` — payment/escrow settlement credentials (not yet wired to a live processor; escrow is currently simulated in the database)

## Project structure

```
app/
  (auth)/login, register/       # public auth pages
  (dashboard)/buyer, supplier,  # role dashboards, product catalog, orders, settings
    products, orders, watchlist, settings/
  admin/                        # super-admin only, edge-middleware gated
  api/                          # route handlers (auth, products, orders, chat)
components/
  ui/                           # shadcn primitives
  shared/                       # app shell, order/product actions, chat thread
lib/                            # prisma/redis clients, auth, masking, search, storage
prisma/schema.prisma            # data model
middleware.ts                   # edge auth gate for /admin
```

## Known gaps

- Escrow settlement is simulated in Postgres, not wired to a real payment
  processor — `VIVA_*` env vars are placeholders for that integration.
- No automated test suite yet.
