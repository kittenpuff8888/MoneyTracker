# 8888 Tracker Redesign — Phase 1

Branch: `feature/8888-tracker-redesign`

## What changed in this phase

**Navigation**
- "Accounts" → **Wallet**, "Equity Tracker" → **Investment Portfolio** (sidebar + mobile nav).
- Removed **Cash Flow** and **Subscriptions** from navigation. `/subscriptions` now redirects to `/dashboard`.

**Wallet page (was Accounts)**
- Wallets grouped by type with dividers and per-type subtotals; total-balance summary card; "Add Wallet" button.
- New wallet type **E-Money** added (Bank, Cash, E-wallet, E-Money, Investment, Savings, Other).
- **Icon picker** (selectable grid of real icons) instead of free-text — see `lib/wallet-icons.tsx`. The card now renders the chosen icon.
- **Balance rounding bug fixed**: amount/balance inputs use `step="any"` (no more "nearest valid values 40000/41000").
- Each wallet card shows recorded income/expense rolled up from transactions.

**Transactions**
- New **Fee** field on the form, label adapts to type (Income / Transfer / Outcome), plus a Fee column in the table.
- Amount input no longer forces 1000 steps.

**Settings**
- Report schedule is now configurable: **frequency (daily/weekly/monthly), day, time** (replaces the locked "Sunday 19:00").

**Categories (foundation)**
- Validation for transaction/budget categories relaxed from a fixed enum to free strings so categories can be user-edited.
- New `transaction_categories` table (migration) — the management UI + form wiring lands in Phase 2.

## REQUIRED: run the database migration

Apply on Supabase (SQL editor or CLI) — additive & idempotent, safe to re-run:

```
supabase/migrations/004_redesign_wallet_fee_reports_categories.sql
```

It adds: `transactions.fee` + fee-aware balance functions, `profiles.report_frequency/report_day/report_time`, and the `transaction_categories` table (seeded with prior defaults per user). **The fee column and the new report fields must exist before the new code runs against production.**

## Not yet done (Phase 2)
- Investment Portfolio rework (realized-trade model driven by Investment-type wallets, Wallet Type column, add/delete-trade popups).
- Dashboard date-range reporting + daily/after-update AI insights.
- Editable-categories management UI in Settings and wiring the dynamic list into the transaction/budget dropdowns.
- Budget page adjustments to match.

## How to build & verify locally
```
pnpm install        # the node_modules in this folder has broken symlinks from copying; reinstall
pnpm type-check
pnpm lint
pnpm build
```
