# 8888 Tracker

**Where Prosperity will Find you.**

8888 Tracker is an IDR-first personal finance application built with Next.js, Supabase Auth/Postgres/RLS, Vercel, Resend, Recharts, and transaction-grounded AI insights.

## Core Features

- Google authentication through Supabase
- User-isolated accounts, transactions, budgets, subscriptions, investments, goals, reports, and audit logs
- Atomic income, outcome, transfer, edit, and delete balance RPCs
- IDR dashboard, category analysis, budgets, cash-flow forecasts, and PDF reports
- User-specific AI insight with deterministic fallback and hourly rate limiting
- Sunday 19:00 WIB weekly email reports with delivery logs and retry handling
- Desktop sidebar, mobile bottom navigation, and in-app usage guide

## Local Setup

```bash
pnpm install
copy .env.example .env.local
pnpm dev
```

Required environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
REPORT_FROM_EMAIL=8888 Tracker <reports@8888tracker.com>
AI_API_KEY=
CRON_SECRET=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `AI_API_KEY`, and `CRON_SECRET` are server-only secrets. Never prefix them with `NEXT_PUBLIC_`.

## Mandatory Database Setup

For a new project:

1. Run [`supabase/schema.sql`](supabase/schema.sql).
2. Run [`supabase/migrations/002_security_hardening.sql`](supabase/migrations/002_security_hardening.sql).
3. Run [`supabase/migrations/003_secure_dashboard_aggregates.sql`](supabase/migrations/003_secure_dashboard_aggregates.sql).

For the existing production project, run migrations `002` and `003` after confirming the base schema already exists.

Then verify:

```bash
pnpm test:rls
```

The live RLS test creates two disposable confirmed users, proves cross-user reads/writes, aggregate-view leaks, and unsafe RPC calls are denied, validates ledger rebalance behavior, then deletes both users.

## Quality Gates

```bash
pnpm test
pnpm type-check
pnpm lint
pnpm build
pnpm audit --prod
```

No deployment is production-ready unless all commands pass and `pnpm test:rls` passes against the target Supabase project.

## Security Model

- Every exposed user-data table has RLS enabled and forced.
- Anonymous users have no public-table privileges.
- Authenticated users can only select rows owned by `auth.uid()`.
- Transaction writes are denied directly and must use identity-checked RPCs.
- Internal balance helpers live in a non-exposed `private` schema.
- User email is synchronized from Supabase Auth and cannot be directly changed through PostgREST.
- User-facing AI reads through the signed-in user's RLS-bound Supabase client.
- The service-role key is used only by the authenticated cron route.
- Financial mutations create immutable user-visible audit records.

See [`docs/SECURITY.md`](docs/SECURITY.md) for the threat model and evidence.

## Weekly Report

Vercel runs `/api/cron/weekly-report` at `0 12 * * 0`, which is Sunday 19:00 WIB. The endpoint fails closed when `CRON_SECRET` is absent and requires the exact Bearer token Vercel sends automatically.

Set `REPORT_FROM_EMAIL` to a sender on a verified Resend domain before emailing users outside the Resend test account.

## 8888Tracker.com

The app is prepared for `https://8888tracker.com`, but the domain must be purchased and attached to Vercel by the domain owner. Follow [`docs/DEPLOYMENT_8888TRACKER.md`](docs/DEPLOYMENT_8888TRACKER.md).

## Operations

- [Security and RLS](docs/SECURITY.md)
- [Backup and recovery](docs/BACKUP_AND_RECOVERY.md)
- [Monitoring and incident response](docs/MONITORING.md)
- [Performance](docs/PERFORMANCE.md)
- [8888Tracker.com deployment](docs/DEPLOYMENT_8888TRACKER.md)
- [Production readiness](docs/PRODUCTION_READINESS.md)
