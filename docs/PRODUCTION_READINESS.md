# Production Readiness Review

Review date: 2026-06-27

## Decision

**NOT FULLY PRODUCTION-READY**

The Critical cross-user and privilege-escalation findings are fixed and live-proven. No known Critical or High security defect remains in the reviewed code and active Supabase policies. Launch is still blocked on operational email delivery, backup/restore evidence, and authenticated browser regression coverage.

Current overall readiness: **78/100**

Security readiness: **92/100**

## Verified Feature Matrix

| Feature | Status | Evidence | Remaining work |
|---|---|---|---|
| Google authentication and callback | PARTIAL | `proxy.ts`, `app/auth/callback/route.ts`; callback handles misplaced root `code` and syncs profile | Repeat a fresh production Google login after deployment and domain cutover |
| Protected routes and session refresh | COMPLETE | `proxy.ts`, `lib/supabase/middleware.ts`; unauthenticated route checks return redirects | Add automated browser session-expiry coverage |
| Profile creation | COMPLETE | Auth trigger plus `sync_profile_from_auth()` in migration `002`; exercised by live RLS test | None identified |
| Core database constraints/indexes | COMPLETE | `supabase/schema.sql`, migrations `002` and `003` | Monitor query plans as data grows |
| Cross-user financial isolation | COMPLETE | Forced RLS, explicit ownership policies, privilege revocation; `pnpm test:rls` passed live | Retain live test in every release checklist |
| Aggregate-view isolation | COMPLETE | `security_invoker` views in migration `003`; live two-user leak checks passed | None identified |
| Transaction create/edit/delete integrity | COMPLETE | Identity-checked atomic RPCs, private helpers, row locks, insufficient-funds checks; live balance matrix passed | Add scheduled reconciliation monitoring |
| Account deletion guard | COMPLETE | `lib/actions/accounts.ts` checks transaction/subscription references | Extend checks if future tables reference accounts |
| Audit trail | COMPLETE | `financial_audit_logs`, trigger, forced RLS, user read-only Settings view | Logs are metadata only; they do not reconstruct old values |
| Soft delete | MISSING | No `deleted_at` columns or restore workflow | Add tombstones, retention policy, purge job, and restore UI before regulated/high-value use |
| Dashboard calculations | COMPLETE | Real user rows plus secure monthly aggregates; fake comparison badges removed | None identified for current feature set |
| Dashboard performance | PARTIAL | Parallel queries, 90-day raw bound, DB aggregate views, non-blocking AI | No production p95 or Lighthouse evidence yet |
| AI transaction grounding | COMPLETE | `lib/ai.ts` uses user accounts, 120-day transactions, budgets, subscriptions, equity; notes excluded; fallback test passes | None required for deterministic mode |
| External LLM mode | PARTIAL | Schema validation, timeout, fallback, quota implemented | `AI_API_KEY` is absent in Vercel; provider mode is not operationally verified |
| AI abuse controls | COMPLETE | `consume_ai_quota()` advisory lock and 10/hour limit; private usage table | Make quota configurable if product tiers are added |
| Weekly report content | COMPLETE in code | User-specific transactions, categories, subscriptions, savings rate, warnings, AI and recommendation | Verify actual rendered email in Gmail |
| Sunday 19:00 WIB schedule | COMPLETE in code | `vercel.json` uses `0 12 * * 0`; Settings is fixed to Sunday 19:00 WIB | Observe one real scheduled invocation after deployment |
| Weekly email delivery | PARTIAL | Retry, processing claim, delivery log, last-sent guard implemented | Vercel lacks `RESEND_API_KEY` and `REPORT_FROM_EMAIL`; verify Resend domain and Gmail delivery |
| Cron authentication/concurrency | COMPLETE | Mandatory constant-time Bearer secret; Vercel `CRON_SECRET` installed; unique processing claim | New deployment required for the added environment variable |
| Financial health score | COMPLETE | `lib/financial-intelligence.ts`, dashboard gauge and explanation | Calibrate weights with user research |
| Cash-flow forecast | PARTIAL | Uses balance, recent daily outcome, upcoming subscriptions | Salary/payday schedule is not implemented |
| Subscription waste analysis | COMPLETE | Real subscription burden/duplicate analysis rendered on `/subscriptions` | Improve duplicate-family detection beyond exact names |
| Budget category tracking | COMPLETE | Category limits, actual spending, threshold states | No salary-level allocation planner |
| Budget allocation simulator | MISSING | No adjustable scenario/planner implementation | Build secure bucket schema and simulator |
| Salary/payday automation | MISSING | No salary profile fields or payday cron | Add idempotent salary transaction workflow |
| Two-tier budget buckets | MISSING | No `budget_buckets` table or transaction bucket relation | Add schema, RLS, UI, and migration |
| Quick transaction shortcuts | MISSING | No quick-add component | Add configurable mobile/desktop quick entry |
| Savings-goals workflow | PARTIAL | Basic `goals` rows appear on dashboard | No `/savings` CRUD, funding transaction, pace status, or linked account |
| Subscription calendar/payment state | MISSING | List and billing date exist only | Add cycle payment state, calendar, and atomic payment RPC |
| First-run onboarding | PARTIAL | In-app guide explains account-to-dashboard flow | No persisted three-step onboarding wizard |
| Installment tracker | MISSING | No installment table, RPC, or UI | Add RLS table and atomic payment workflow |
| Equity totals/allocation/P&L | PARTIAL | Summary, gain/loss, allocation chart and responsive table exist | No price history, performance trend, or last-updated workflow |
| Reports page | PARTIAL | Weekly/monthly summary, warnings, AI, PDF link | Missing month selector, six-month comparison, and year projection |
| Monthly PDF | PARTIAL | Authenticated user-specific PDF endpoint | Current PDF is text-based; add chart rendering and visual regression QA |
| Transaction filters and CSV | MISSING | Latest 100 rows only | Add server-side filters, pagination, and CSV export |
| Mutation feedback | COMPLETE | Sonner toasts wrap account, transaction, budget, subscription, equity, and settings mutations | Add action-specific analytics only if consented |
| Delete confirmation | COMPLETE | Reusable accessible `ConfirmDeleteButton` used on destructive UI actions | Goals have no CRUD surface yet |
| Mobile navigation/layout | COMPLETE for current pages | Mobile bottom nav, responsive cards/tables/forms, stable controls | Recheck authenticated pages on physical iOS/Android devices |
| In-app guide | COMPLETE | Bottom-left modal guide; no page navigation required | Update steps when future workflows ship |
| Rebrand | COMPLETE in code | 8888 Tracker name, exact vision line, supplied logo, icons, landing copy | None in code |
| `8888Tracker.com` cutover | PARTIAL | Metadata and runbook are ready | Domain purchase/DNS/Vercel/Supabase/Google/Resend cutover is not complete |
| Secret handling | COMPLETE in repository | Private env ignored; history scan found no provider-key patterns; server keys lack `NEXT_PUBLIC_` | Rotate any secret ever shared outside protected stores |
| Dependency security | COMPLETE at review time | `pnpm audit --prod` reports no known vulnerabilities | Re-run on every deployment |
| Backup and restore | PARTIAL | Backup/restore runbook and logical dump script exist | Configure scheduled backup and complete a documented restore drill |
| Monitoring and incident response | PARTIAL | Monitoring runbook and signals defined | Configure external alerts and ownership/escalation |
| Automated test suite | PARTIAL | Unit/security tests, typecheck, lint, build, route checks, live RLS/ledger test | No full authenticated browser CRUD suite or email sandbox integration test |

## Release Blockers

1. Add and verify `RESEND_API_KEY` and `REPORT_FROM_EMAIL` in Vercel, then deliver a real Gmail report.
2. Complete and record a Supabase backup restore drill.
3. Run authenticated browser CRUD regression on desktop and a physical mobile device.
4. Redeploy and observe one Sunday 19:00 WIB cron invocation.

The missing salary, bucket, savings, installment, calendar, and advanced-report features are product-scope gaps. They must not be advertised until implemented, but they do not create a cross-user data leak in the currently shipped feature set.
