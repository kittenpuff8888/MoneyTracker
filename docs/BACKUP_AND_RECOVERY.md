# Backup And Recovery

## Required Policy

Financial data needs both provider backups and an independent encrypted export.

Supabase automatically provides daily backups on Pro, Team, and Enterprise plans. Free projects should regularly create logical exports and store them off-site. Point-in-Time Recovery is a paid add-on. See [Supabase database backups](https://supabase.com/docs/guides/platform/backups).

## Targets

- Production target RPO: 24 hours with daily logical exports.
- Preferred production RPO: minutes with Supabase PITR.
- Target RTO: 4 hours for logical restore; 1 hour with tested PITR.
- Retention: 7 daily, 4 weekly, and 12 monthly encrypted exports.

## Backup Procedure

1. Install the Supabase CLI.
2. Obtain the direct database connection string from Supabase.
3. Set it locally as `SUPABASE_DB_URL`; never commit it.
4. Run:

```powershell
.\scripts\backup-supabase.ps1
```

5. Encrypt the resulting dump before uploading it to off-site storage.
6. Record the dump date, checksum, encryption key owner, and retention expiration.

Database backups do not restore deleted Supabase Storage objects; storage requires a separate export plan.

## Restore Drill

Perform quarterly:

1. Create an isolated Supabase project.
2. Restore the latest logical dump.
3. Apply any newer migrations.
4. run `pnpm test:rls` against the restored project;
5. verify account and transaction counts;
6. verify one sample user's account balances against transaction history;
7. delete the isolated project after the drill.

Never test a destructive restore against the production project.

## Soft Delete Plan

Current financial deletion is hard delete plus immutable audit metadata. Before regulated or multi-admin use:

1. add `deleted_at`, `deleted_by`, and `deletion_reason`;
2. replace direct deletes with audited security-definer RPCs;
3. hide deleted rows through RLS;
4. retain deleted financial records for a defined recovery period;
5. add a privileged, logged restore workflow;
6. purge only after retention expires.

This is a documented next-stage control, not currently implemented.

## Concurrency Plan

Transaction balance changes are atomic database updates inside a single RPC transaction. Edits lock the target transaction row before reversal. Weekly report processing uses a unique database claim.

Before high-volume use:

- add optimistic version columns to editable records;
- reject stale updates;
- add balance reconciliation jobs;
- alert when stored account balances differ from transaction-derived balances.
