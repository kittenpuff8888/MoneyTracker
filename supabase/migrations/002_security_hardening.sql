-- 8888 Tracker security hardening.
-- Safe to rerun. Apply this migration to every existing Supabase environment.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

alter table public.profiles
  add column if not exists weekly_report_enabled boolean default true,
  add column if not exists weekly_report_day text default 'sunday',
  add column if not exists last_weekly_report_sent_at timestamptz;

create table if not exists public.email_report_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_type text not null default 'weekly',
  period_start date not null,
  period_end date not null,
  recipient_email text not null,
  status text not null check (status in ('processing', 'sent', 'failed', 'skipped')),
  error_message text,
  resend_id text,
  attempts integer not null default 1,
  sent_at timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists email_report_logs_user_sent_idx
  on public.email_report_logs(user_id, sent_at desc);
create index if not exists email_report_logs_status_idx
  on public.email_report_logs(status);
alter table public.email_report_logs enable row level security;

create table if not exists public.financial_audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  entity_type text not null,
  entity_id uuid not null,
  created_at timestamptz not null default now()
);

create index if not exists financial_audit_logs_user_created_idx
  on public.financial_audit_logs(user_id, created_at desc);

alter table public.financial_audit_logs enable row level security;
alter table public.financial_audit_logs force row level security;

drop policy if exists "Users can view own financial audit logs" on public.financial_audit_logs;
create policy "Users can view own financial audit logs"
on public.financial_audit_logs
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create table if not exists private.ai_request_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  requested_at timestamptz not null default now()
);

create index if not exists ai_request_usage_user_requested_idx
  on private.ai_request_usage(user_id, requested_at desc);

create or replace function private.log_financial_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb;
  v_user_id uuid;
  v_entity_id uuid;
begin
  v_row := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_entity_id := nullif(v_row ->> 'id', '')::uuid;
  v_user_id := case
    when tg_table_name = 'profiles' then v_entity_id
    else nullif(v_row ->> 'user_id', '')::uuid
  end;

  if v_user_id is not null and v_entity_id is not null then
    insert into public.financial_audit_logs(user_id, action, entity_type, entity_id)
    values (v_user_id, tg_op, tg_table_name, v_entity_id);
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all privileges on function private.log_financial_change() from public, anon, authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles',
    'accounts',
    'transactions',
    'budgets',
    'subscriptions',
    'equity_assets',
    'goals'
  ]
  loop
    execute format('drop trigger if exists audit_%I_changes on public.%I', table_name, table_name);
    execute format(
      'create trigger audit_%I_changes after insert or update or delete on public.%I for each row execute function private.log_financial_change()',
      table_name,
      table_name
    );
  end loop;
end;
$$;

create or replace function public.sync_profile_from_auth()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_claims jsonb := auth.jwt();
begin
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  insert into public.profiles(id, email, full_name, avatar_url)
  values (
    v_user_id,
    v_claims ->> 'email',
    coalesce(
      v_claims -> 'user_metadata' ->> 'full_name',
      v_claims -> 'user_metadata' ->> 'name'
    ),
    coalesce(
      v_claims -> 'user_metadata' ->> 'avatar_url',
      v_claims -> 'user_metadata' ->> 'picture'
    )
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(public.profiles.full_name, excluded.full_name),
      avatar_url = excluded.avatar_url;
end;
$$;

revoke all privileges on function public.sync_profile_from_auth() from public, anon;
grant execute on function public.sync_profile_from_auth() to authenticated;

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles(id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all privileges on function private.handle_new_auth_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row execute function private.handle_new_auth_user();

create or replace function public.consume_ai_quota()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_count integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 8888));

  delete from private.ai_request_usage
  where requested_at < now() - interval '24 hours';

  select count(*) into v_count
  from private.ai_request_usage
  where user_id = v_user_id
    and requested_at >= now() - interval '1 hour';

  if v_count >= 10 then
    return false;
  end if;

  insert into private.ai_request_usage(user_id) values (v_user_id);
  return true;
end;
$$;

revoke all privileges on function public.consume_ai_quota() from public, anon;
grant execute on function public.consume_ai_quota() to authenticated;

create or replace function private.reverse_transaction_balance(p_transaction public.transactions)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_transaction.type = 'income' then
    update public.accounts
    set current_balance = current_balance - p_transaction.amount
    where id = p_transaction.to_account_id and user_id = p_transaction.user_id;
  elsif p_transaction.type = 'outcome' then
    update public.accounts
    set current_balance = current_balance + p_transaction.amount
    where id = p_transaction.from_account_id and user_id = p_transaction.user_id;
  elsif p_transaction.type = 'transfer' then
    update public.accounts
    set current_balance = current_balance + p_transaction.amount
    where id = p_transaction.from_account_id and user_id = p_transaction.user_id;
    update public.accounts
    set current_balance = current_balance - p_transaction.amount
    where id = p_transaction.to_account_id and user_id = p_transaction.user_id;
  end if;
end;
$$;

create or replace function private.apply_transaction_balance(
  p_user_id uuid,
  p_type text,
  p_amount numeric,
  p_from_account_id uuid,
  p_to_account_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_type = 'income' then
    if p_to_account_id is null then
      raise exception 'Income requires a destination account owned by the user.';
    end if;
    perform 1
    from public.accounts
    where id = p_to_account_id and user_id = p_user_id
    for update;
    if not found then
      raise exception 'Income requires a destination account owned by the user.';
    end if;
    update public.accounts
    set current_balance = current_balance + p_amount
    where id = p_to_account_id and user_id = p_user_id;
  elsif p_type = 'outcome' then
    if p_from_account_id is null then
      raise exception 'Outcome requires a source account owned by the user.';
    end if;
    perform 1
    from public.accounts
    where id = p_from_account_id
      and user_id = p_user_id
      and current_balance >= p_amount
    for update;
    if not found then
      raise exception 'Insufficient balance or source account is not owned by the user.';
    end if;
    update public.accounts
    set current_balance = current_balance - p_amount
    where id = p_from_account_id and user_id = p_user_id;
  elsif p_type = 'transfer' then
    if p_from_account_id is null or p_to_account_id is null or p_from_account_id = p_to_account_id then
      raise exception 'Transfer requires two different accounts.';
    end if;
    perform 1
    from public.accounts
    where id in (p_from_account_id, p_to_account_id)
      and user_id = p_user_id
    order by id
    for update;
    if (
      select count(*)
      from public.accounts
      where id in (p_from_account_id, p_to_account_id)
        and user_id = p_user_id
    ) <> 2 then
      raise exception 'Transfer accounts must be owned by the user.';
    end if;
    if (
      select current_balance
      from public.accounts
      where id = p_from_account_id and user_id = p_user_id
    ) < p_amount then
      raise exception 'Insufficient balance for transfer.';
    end if;
    update public.accounts
    set current_balance = current_balance - p_amount
    where id = p_from_account_id and user_id = p_user_id;
    update public.accounts
    set current_balance = current_balance + p_amount
    where id = p_to_account_id and user_id = p_user_id;
  else
    raise exception 'Unsupported transaction type.';
  end if;
end;
$$;

revoke all privileges on function private.reverse_transaction_balance(public.transactions) from public, anon, authenticated;
revoke all privileges on function private.apply_transaction_balance(uuid, text, numeric, uuid, uuid) from public, anon, authenticated;

create or replace function public.apply_transaction(
  p_transaction_id uuid,
  p_user_id uuid,
  p_type text,
  p_amount numeric,
  p_category text,
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_transaction_date date,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_transaction_id uuid;
  v_old_transaction public.transactions%rowtype;
begin
  if v_actor is null or v_actor <> p_user_id then
    raise exception 'Unauthorized transaction mutation.';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than 0.';
  end if;
  if p_category is null or btrim(p_category) = '' or p_transaction_date is null then
    raise exception 'Category and transaction date are required.';
  end if;

  if p_transaction_id is not null then
    select t.* into v_old_transaction
    from public.transactions t
    where t.id = p_transaction_id and t.user_id = p_user_id
    for update;

    if not found then
      raise exception 'Transaction not found.';
    end if;

    perform private.reverse_transaction_balance(v_old_transaction);

    update public.transactions
    set type = p_type,
        amount = p_amount,
        category = p_category,
        from_account_id = p_from_account_id,
        to_account_id = p_to_account_id,
        transaction_date = p_transaction_date,
        notes = p_notes
    where id = p_transaction_id and user_id = p_user_id
    returning id into v_transaction_id;
  else
    insert into public.transactions(
      user_id,
      type,
      amount,
      category,
      from_account_id,
      to_account_id,
      transaction_date,
      notes
    )
    values (
      p_user_id,
      p_type,
      p_amount,
      p_category,
      p_from_account_id,
      p_to_account_id,
      p_transaction_date,
      p_notes
    )
    returning id into v_transaction_id;
  end if;

  perform private.apply_transaction_balance(
    p_user_id,
    p_type,
    p_amount,
    p_from_account_id,
    p_to_account_id
  );
  return v_transaction_id;
end;
$$;

create or replace function public.delete_transaction_and_rebalance(
  p_transaction_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_old_transaction public.transactions%rowtype;
begin
  if v_actor is null or v_actor <> p_user_id then
    raise exception 'Unauthorized transaction deletion.';
  end if;

  select t.* into v_old_transaction
  from public.transactions t
  where t.id = p_transaction_id and t.user_id = p_user_id
  for update;

  if not found then
    raise exception 'Transaction not found.';
  end if;

  perform private.reverse_transaction_balance(v_old_transaction);
  delete from public.transactions
  where id = p_transaction_id and user_id = p_user_id;
end;
$$;

revoke all privileges on function public.apply_transaction(uuid, uuid, text, numeric, text, uuid, uuid, date, text) from public, anon;
revoke all privileges on function public.delete_transaction_and_rebalance(uuid, uuid) from public, anon;
grant execute on function public.apply_transaction(uuid, uuid, text, numeric, text, uuid, uuid, date, text) to authenticated;
grant execute on function public.delete_transaction_and_rebalance(uuid, uuid) to authenticated;

drop function if exists public.reverse_transaction_balance(public.transactions);
drop function if exists public.apply_transaction_balance(uuid, text, numeric, uuid, uuid);

alter table public.email_report_logs
  drop constraint if exists email_report_logs_status_check;
alter table public.email_report_logs
  add constraint email_report_logs_status_check
  check (status in ('processing', 'sent', 'failed', 'skipped'));

create unique index if not exists email_report_logs_processing_unique_idx
  on public.email_report_logs(user_id, report_type, period_start)
  where status = 'processing';

alter table public.profiles force row level security;
alter table public.accounts force row level security;
alter table public.transactions force row level security;
alter table public.budgets force row level security;
alter table public.subscriptions force row level security;
alter table public.equity_assets force row level security;
alter table public.goals force row level security;
alter table public.email_report_logs force row level security;

drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can update own profile preferences" on public.profiles;
create policy "Users can view own profile"
on public.profiles for select to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = id);
create policy "Users can update own profile preferences"
on public.profiles for update to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "Users can view own accounts" on public.accounts;
drop policy if exists "Users can insert own accounts" on public.accounts;
drop policy if exists "Users can update own accounts" on public.accounts;
drop policy if exists "Users can delete own accounts" on public.accounts;
create policy "Users can view own accounts"
on public.accounts for select to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);
create policy "Users can insert own accounts"
on public.accounts for insert to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);
create policy "Users can update own accounts"
on public.accounts for update to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy "Users can delete own accounts"
on public.accounts for delete to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can view own transactions" on public.transactions;
drop policy if exists "Users can insert own transactions" on public.transactions;
drop policy if exists "Users can update own transactions" on public.transactions;
drop policy if exists "Users can delete own transactions" on public.transactions;
create policy "Users can view own transactions"
on public.transactions for select to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can view own budgets" on public.budgets;
drop policy if exists "Users can insert own budgets" on public.budgets;
drop policy if exists "Users can update own budgets" on public.budgets;
drop policy if exists "Users can delete own budgets" on public.budgets;
create policy "Users can view own budgets"
on public.budgets for select to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);
create policy "Users can insert own budgets"
on public.budgets for insert to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);
create policy "Users can update own budgets"
on public.budgets for update to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy "Users can delete own budgets"
on public.budgets for delete to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can view own subscriptions" on public.subscriptions;
drop policy if exists "Users can insert own subscriptions" on public.subscriptions;
drop policy if exists "Users can update own subscriptions" on public.subscriptions;
drop policy if exists "Users can delete own subscriptions" on public.subscriptions;
create policy "Users can view own subscriptions"
on public.subscriptions for select to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);
create policy "Users can insert own subscriptions"
on public.subscriptions for insert to authenticated
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and (
    account_id is null
    or exists (
      select 1 from public.accounts a
      where a.id = account_id and a.user_id = (select auth.uid())
    )
  )
);
create policy "Users can update own subscriptions"
on public.subscriptions for update to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and (
    account_id is null
    or exists (
      select 1 from public.accounts a
      where a.id = account_id and a.user_id = (select auth.uid())
    )
  )
);
create policy "Users can delete own subscriptions"
on public.subscriptions for delete to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can view own equity assets" on public.equity_assets;
drop policy if exists "Users can insert own equity assets" on public.equity_assets;
drop policy if exists "Users can update own equity assets" on public.equity_assets;
drop policy if exists "Users can delete own equity assets" on public.equity_assets;
create policy "Users can view own equity assets"
on public.equity_assets for select to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);
create policy "Users can insert own equity assets"
on public.equity_assets for insert to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);
create policy "Users can update own equity assets"
on public.equity_assets for update to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy "Users can delete own equity assets"
on public.equity_assets for delete to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can view own goals" on public.goals;
drop policy if exists "Users can insert own goals" on public.goals;
drop policy if exists "Users can update own goals" on public.goals;
drop policy if exists "Users can delete own goals" on public.goals;
create policy "Users can view own goals"
on public.goals for select to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);
create policy "Users can insert own goals"
on public.goals for insert to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);
create policy "Users can update own goals"
on public.goals for update to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy "Users can delete own goals"
on public.goals for delete to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can view own email report logs" on public.email_report_logs;
drop policy if exists "Users can insert own email report logs" on public.email_report_logs;
create policy "Users can view own email report logs"
on public.email_report_logs for select to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

revoke all privileges on all tables in schema public from anon;

revoke all privileges on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update(full_name, weekly_report_enabled, weekly_report_day) on public.profiles to authenticated;

revoke all privileges on public.accounts from authenticated;
grant select, insert, update, delete on public.accounts to authenticated;

revoke all privileges on public.transactions from authenticated;
grant select on public.transactions to authenticated;

revoke all privileges on public.budgets from authenticated;
grant select, insert, update, delete on public.budgets to authenticated;

revoke all privileges on public.subscriptions from authenticated;
grant select, insert, update, delete on public.subscriptions to authenticated;

revoke all privileges on public.equity_assets from authenticated;
grant select, insert, update, delete on public.equity_assets to authenticated;

revoke all privileges on public.goals from authenticated;
grant select, insert, update, delete on public.goals to authenticated;

revoke all privileges on public.email_report_logs from authenticated;
grant select on public.email_report_logs to authenticated;

revoke all privileges on public.financial_audit_logs from authenticated;
grant select on public.financial_audit_logs to authenticated;

revoke create on schema public from public;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke execute on functions from public;
