# Monitoring And Incident Response

## Daily Signals

- Vercel function error rate and latency
- Supabase API and Postgres errors
- authentication failures and unusual login volume
- AI endpoint `429` and `503` responses
- weekly report `failed` or long-running `processing` rows
- dependency and secret scanning in CI

## Weekly Checks

Run:

```bash
pnpm audit --prod
pnpm test
pnpm type-check
pnpm lint
pnpm build
```

Review:

- `email_report_logs` for failed deliveries;
- `financial_audit_logs` for unexpected deletions;
- Vercel cron execution at Sunday 12:00 UTC;
- Supabase Auth audit logs;
- database size and backup freshness.

## Alerts

Configure alerts for:

- any 5xx rate above 1% for five minutes;
- AI endpoint cost or request spikes;
- cron failure or no Sunday execution;
- more than three weekly email failures;
- unexpected service-role use;
- backup older than 26 hours;
- any RLS verification failure.

## Incident Response

For suspected cross-user access:

1. disable the affected route or take the deployment offline;
2. rotate Supabase service-role and affected provider keys;
3. preserve Vercel, Supabase, auth, email, and audit logs;
4. identify affected users and time range;
5. patch and run the two-user RLS test;
6. redeploy only after Critical and High findings are closed;
7. follow applicable notification and privacy obligations.

Do not place full financial records, JWTs, OAuth codes, or API keys in application logs.
