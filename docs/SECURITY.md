# Security Review

## Security Gate

Cross-user financial-data access is Critical severity. The application must not be called production-ready until:

1. Migrations `002_security_hardening.sql` and `003_secure_dashboard_aggregates.sql` are installed in production.
2. `pnpm test:rls` passes against production.
3. `pnpm audit --prod` reports no known vulnerabilities.
4. Vercel secrets are configured only as server-side environment variables.

Supabase recommends RLS on every table in an exposed schema and warns that service keys bypass RLS. It also recommends explicit authenticated checks and indexed ownership columns. See the [Supabase RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Fixed Critical Finding

The original SQL exposed two `SECURITY DEFINER` balance helper functions in `public`, and one accepted an arbitrary `user_id`. An authenticated attacker could call that helper directly and tamper with another user's account balance.

The hardening migration:

- moves helpers to the non-exposed `private` schema;
- revokes all helper execution from `public`, `anon`, and `authenticated`;
- exposes only `apply_transaction` and `delete_transaction_and_rebalance`;
- rejects missing identities and any `p_user_id` different from `auth.uid()`;
- revokes direct transaction INSERT/UPDATE/DELETE privileges.
- locks account rows during balance changes and rejects overdrawing outcomes/transfers.

The live production test passed with two disposable authenticated users. It verified cross-user reads, writes, ownership forgery, RPC impersonation, linked-account forgery, audit-log access, and aggregate-view isolation. It also verified income, outcome, transfer, edit, delete, and insufficient-funds ledger behavior.

## RLS Matrix

| Table | Authenticated access | Ownership rule |
|---|---|---|
| `profiles` | SELECT; limited preference UPDATE | `id = auth.uid()` |
| `accounts` | SELECT/INSERT/UPDATE/DELETE | `user_id = auth.uid()` |
| `transactions` | SELECT only; mutations through RPC | `user_id = auth.uid()` |
| `budgets` | SELECT/INSERT/UPDATE/DELETE | `user_id = auth.uid()` |
| `subscriptions` | SELECT/INSERT/UPDATE/DELETE | Owner plus linked account ownership |
| `equity_assets` | SELECT/INSERT/UPDATE/DELETE | `user_id = auth.uid()` |
| `goals` | SELECT/INSERT/UPDATE/DELETE | `user_id = auth.uid()` |
| `email_report_logs` | SELECT only | `user_id = auth.uid()` |
| `financial_audit_logs` | SELECT only | `user_id = auth.uid()` |

All listed tables use both `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY`. Anonymous table privileges are revoked.

`monthly_summary` and `category_monthly_spending` use PostgreSQL `security_invoker`, so their underlying transaction reads remain constrained by the caller's RLS policy. Anonymous access is revoked.

## Service-Role Boundary

`SUPABASE_SERVICE_ROLE_KEY` is referenced only by the weekly cron route. The user-facing AI endpoint uses the authenticated SSR client, so every finance query remains subject to the user's RLS policies.

The cron endpoint:

- returns `503` if `CRON_SECRET` is absent;
- compares the exact Authorization value with constant-time comparison;
- never trusts the spoofable User-Agent header;
- uses a unique processing claim to prevent concurrent duplicate delivery;
- writes per-user delivery status.

Vercel automatically sends `CRON_SECRET` as a Bearer Authorization header when configured. See [Vercel cron security](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

## Secrets

Repository history was scanned for Supabase secret keys, service-role assignments, OpenAI keys, and Resend keys. No matching secrets and no tracked private `.env` files were found.

Required controls:

- keep `.env.local` untracked;
- use separate development and production secrets;
- rotate a secret immediately if pasted into chat, logs, screenshots, or Git;
- never expose server secrets with a `NEXT_PUBLIC_` prefix;
- restrict Vercel environment variables to the required environments.

## Web Security

`next.config.ts` applies:

- Content Security Policy;
- HSTS;
- clickjacking protection;
- MIME sniffing protection;
- strict referrer policy;
- permissions restrictions;
- disabled framework disclosure;
- Google-only remote avatar hosts.

Next.js supports these response headers through `next.config` headers. See the [Next.js headers reference](https://nextjs.org/docs/app/api-reference/config/next-config-js/headers).

## AI Privacy

AI prompts contain the signed-in user's recent financial context. Notes are excluded from the external AI payload. AI output is schema-validated before rendering, and malformed output falls back to deterministic transaction-based analysis.

Before public launch, disclose the AI processor in the privacy notice and provide a way to disable external AI if required by the intended privacy policy.

## Verification

Automated local contract tests:

```bash
pnpm test
```

Live two-user isolation test:

```bash
pnpm test:rls
```

Manual SQL inspection:

Run `supabase/SECURITY_VERIFICATION.sql` in Supabase SQL Editor and retain its output with the release record.
