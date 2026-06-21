# Money Tracker

Money Tracker is a production-ready personal finance dashboard for Indonesian users. It uses Supabase Google Auth, Supabase PostgreSQL with Row Level Security, server-side transaction balance logic, Recharts, Resend weekly reports, and a server-side AI insight wrapper with a rule-based fallback.

The UI is intentionally white, light blue, and sky blue, with dense modular finance widgets inspired by the supplied dashboard references.

## Features

- Google/Gmail login with Supabase Auth
- Protected dashboard routes
- User-specific accounts, transactions, budgets, subscriptions, equity assets, goals, and reports
- IDR-only currency formatting
- Income, Outcome, and Transfer / Move Money transactions
- Server-side balance updates through Supabase RPC
- Net balance, savings ratio, burn rate, remaining balance, overspending, budget warnings, subscriptions, charts, goals, and transaction history
- Equity allocation, gain/loss, and asset list
- Weekly and monthly reports with email preview
- Vercel Cron endpoint for weekly Resend email reports
- AI budgeting endpoint with rule-based fallback when `AI_API_KEY` is missing

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth, PostgreSQL, and RLS
- Recharts
- React Hook Form
- Zod
- Resend
- Lucide React
- date-fns

Best free tool stack: GitHub for source control, Codex for code generation, Cursor or VS Code for editing, Node.js LTS and npm locally, Supabase free tier for auth/database, Vercel free tier for hosting and cron, Resend free tier for email, Recharts and Lucide for UI.

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
AI_API_KEY=
CRON_SECRET=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`SUPABASE_SERVICE_ROLE_KEY` is required for the cron email route because it must fetch all profiles with weekly reports enabled. Never expose it to browser code.

## Supabase Setup

1. Create a Supabase project.
2. Copy the project URL into `NEXT_PUBLIC_SUPABASE_URL`.
3. Copy the anon key into `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Copy the service role key into `SUPABASE_SERVICE_ROLE_KEY`.
5. Open Supabase SQL Editor.
6. Run `supabase/schema.sql`.
7. Optional for development: adapt `supabase/seed.sql` with a real test auth user id.

## Google Auth Setup

In Supabase Dashboard:

1. Go to Authentication, Providers, Google.
2. Enable Google.
3. Add your Google OAuth client id and secret.
4. Add redirect URLs:

```txt
http://localhost:3000/auth/callback
https://your-vercel-domain.vercel.app/auth/callback
```

The app redirects successful auth to `/dashboard` and creates/updates a `profiles` row from Gmail metadata.

## RLS Explanation

All user-owned tables have Row Level Security enabled:

- `profiles.id = auth.uid()`
- `accounts.user_id = auth.uid()`
- `transactions.user_id = auth.uid()`
- `budgets.user_id = auth.uid()`
- `subscriptions.user_id = auth.uid()`
- `equity_assets.user_id = auth.uid()`
- `goals.user_id = auth.uid()`

Every page query includes the authenticated `user.id`, and every RLS policy restricts select, insert, update, and delete to the same user.

## Transaction Logic

Transaction writes call `apply_transaction` in Supabase:

- Income increases `to_account.current_balance`
- Outcome decreases `from_account.current_balance`
- Transfer decreases `from_account.current_balance` and increases `to_account.current_balance`
- Transfer does not change total net worth
- Editing a transaction reverses the old balance effect first, then applies the new one
- Deleting a transaction reverses the balance effect

The browser never calculates or mutates balances directly.

## First Account

1. Login with Gmail.
2. Open `/accounts`.
3. Create an account such as `Main Wallet`, `Bank Account`, or `E-wallet`.
4. Open `/transactions`.
5. Add income, outcome, or transfer records.
6. Return to `/dashboard` to see personalized totals and charts.

## Resend Setup

1. Create a Resend API key.
2. Add `RESEND_API_KEY` to `.env.local` and Vercel.
3. For production, change the `from` address in `lib/email.ts` to a verified Resend domain.

## AI Setup

Set `AI_API_KEY` on the server. If it is missing, `lib/ai.ts` generates a rule-based conclusion, unusual-spending explanation, and 50/30/20 recommended budget.

## Vercel Deployment

1. Push this standalone project to a new GitHub repository, for example `money-tracker`.
2. Import the repository in Vercel.
3. Add all environment variables.
4. Deploy.
5. Add the production callback URL in Supabase Google Auth.

## Vercel Cron

`vercel.json` schedules:

```json
{
  "path": "/api/cron/weekly-report",
  "schedule": "0 1 * * 0"
}
```

It runs every Sunday at 01:00 UTC. If `CRON_SECRET` is configured, call the endpoint with:

```http
Authorization: Bearer YOUR_CRON_SECRET
```

## Screens and Pages

- `/` landing and Google login
- `/dashboard` financial overview
- `/accounts` account management
- `/transactions` income, outcome, and transfer management
- `/budget` monthly category limits and warnings
- `/subscriptions` recurring bills
- `/equity` custom investment tracking
- `/reports` weekly/monthly summaries and email preview
- `/settings` profile, report preferences, IDR currency lock, logout
- `/api/ai/budget-insight` authenticated AI insight endpoint
- `/api/cron/weekly-report` cron-friendly weekly report sender
