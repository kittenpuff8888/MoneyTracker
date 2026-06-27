# Deploying 8888Tracker.com

The application code is branded and prepared for `https://8888tracker.com`. DNS currently has no public A record. Domain purchase and DNS ownership must be completed by the owner.

## 1. Acquire And Attach The Domain

1. Purchase `8888tracker.com` from a registrar if it is available.
2. In Vercel, open the 8888 Tracker project.
3. Go to **Settings -> Domains**.
4. Add:
   - `8888tracker.com`
   - `www.8888tracker.com`
5. Follow Vercel's displayed DNS records at the registrar.
6. Choose one canonical domain and redirect the other.

Do not copy guessed DNS values; use the records Vercel shows for this project.

## 2. Vercel Environment

Set Production values:

```env
NEXT_PUBLIC_SITE_URL=https://8888tracker.com
REPORT_FROM_EMAIL=8888 Tracker <reports@8888tracker.com>
CRON_SECRET=<a new random value of at least 32 bytes>
```

Keep the existing Supabase, Resend, and AI variables. Redeploy after any environment change.

## 3. Supabase Authentication URLs

In **Authentication -> URL Configuration**:

- Site URL: `https://8888tracker.com`
- Redirect URL: `https://8888tracker.com/auth/callback`
- Keep `http://localhost:3000/auth/callback` for local development.
- Keep the Vercel callback temporarily during cutover.

## 4. Google OAuth

Google's authorized redirect URI remains the Supabase callback:

```text
https://nxvvejgzchelywdueone.supabase.co/auth/v1/callback
```

The app's final callback is controlled in Supabase URL Configuration.

## 5. Resend

1. Add and verify `8888tracker.com` in Resend.
2. Add the requested DNS records.
3. Set `REPORT_FROM_EMAIL` to the verified sender.
4. Send a report to a real Gmail address.
5. Confirm SPF, DKIM, and delivery status.

## 6. Security Migration

Run:

```text
supabase/migrations/002_security_hardening.sql
supabase/migrations/003_secure_dashboard_aggregates.sql
```

Then:

```bash
pnpm test:rls
```

Do not deploy the code that depends on `sync_profile_from_auth` and `consume_ai_quota` until this migration is active.

## 7. Cutover Verification

- HTTPS certificate is valid.
- `http://` redirects to `https://`.
- `www` redirects to the canonical domain.
- Google login returns to `https://8888tracker.com/auth/callback`.
- Security headers are present.
- Desktop and mobile pages render.
- Weekly email sender is verified.
- Cron returns `401` without the correct secret.
- `pnpm test:rls` passes.
