# Performance Review

## Implemented

- Landing image replaced with lightweight HTML/CSS finance preview.
- No continuous animations or animation framework.
- Mobile landing fits a 390 x 844 viewport without horizontal overflow.
- Dashboard finance queries run in parallel.
- Dashboard raw history is bounded to 90 days for intelligence and weekly comparisons.
- Six-month chart totals use RLS-invoker PostgreSQL aggregate views.
- Transaction list is bounded to the latest 100 records.
- Accounts page requests only five recent transfers.
- AI generation happens after initial UI rendering.
- Duplicate in-flight AI requests are deduplicated.
- Recharts containers have stable dimensions.
- Mobile tables use readable card layouts.
- RLS ownership columns are indexed.

## Operational Targets

- Landing mobile Lighthouse Performance: at least 90.
- Authenticated page p95 server response: under 1 second excluding cold starts.
- Interaction response: under 200 ms for local UI actions.
- No page-level horizontal overflow at 390 px.

## Next Scale Step

When transaction volume exceeds the current bounded history:

- add cursor pagination;
- cache non-sensitive aggregate results per user;
- add query timing to monitoring;
- move report generation to a background queue if cron duration grows.
