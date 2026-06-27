-- Read-only security inspection. Run in Supabase SQL Editor after migrations.

select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'profiles',
    'accounts',
    'transactions',
    'budgets',
    'subscriptions',
    'equity_assets',
    'goals',
    'email_report_logs',
    'financial_audit_logs'
  )
order by c.relname;

select
  c.relname as view_name,
  c.reloptions
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('monthly_summary', 'category_monthly_spending')
order by c.relname;

select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

select
  routine_schema,
  routine_name,
  grantee,
  privilege_type
from information_schema.routine_privileges
where routine_schema in ('public', 'private')
  and routine_name in (
    'apply_transaction',
    'delete_transaction_and_rebalance',
    'apply_transaction_balance',
    'reverse_transaction_balance',
    'consume_ai_quota',
    'sync_profile_from_auth'
  )
order by routine_schema, routine_name, grantee;

select
  grantee,
  table_name,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
order by grantee, table_name, privilege_type;
