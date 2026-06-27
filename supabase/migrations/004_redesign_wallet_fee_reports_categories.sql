-- 8888 Tracker redesign migration (additive & idempotent).
-- Safe to run on the live database. Adds:
--   1. transactions.fee + fee-aware balance functions
--   2. profiles report-schedule columns (frequency/day/time)
--   3. transaction_categories table (editable categories) with RLS + defaults
-- Run AFTER 002_security_hardening.sql / 003_secure_dashboard_aggregates.sql.

-------------------------------------------------------------------------------
-- 1. TRANSACTION FEE
-------------------------------------------------------------------------------
alter table transactions
  add column if not exists fee numeric not null default 0 check (fee >= 0);

-- Reverse a transaction's effect on balances, including its fee.
create or replace function reverse_transaction_balance(p_transaction transactions)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fee numeric := coalesce(p_transaction.fee, 0);
begin
  if p_transaction.type = 'income' then
    -- income credited (amount - fee) to destination
    update accounts
    set current_balance = current_balance - (p_transaction.amount - v_fee)
    where id = p_transaction.to_account_id and user_id = p_transaction.user_id;
  elsif p_transaction.type = 'outcome' then
    -- outcome debited (amount + fee) from source
    update accounts
    set current_balance = current_balance + (p_transaction.amount + v_fee)
    where id = p_transaction.from_account_id and user_id = p_transaction.user_id;
  elsif p_transaction.type = 'transfer' then
    -- source debited (amount + fee), destination credited (amount)
    update accounts
    set current_balance = current_balance + (p_transaction.amount + v_fee)
    where id = p_transaction.from_account_id and user_id = p_transaction.user_id;
    update accounts
    set current_balance = current_balance - p_transaction.amount
    where id = p_transaction.to_account_id and user_id = p_transaction.user_id;
  end if;
end;
$$;

-- Apply balance change with fee.
create or replace function apply_transaction_balance(
  p_user_id uuid,
  p_type text,
  p_amount numeric,
  p_fee numeric,
  p_from_account_id uuid,
  p_to_account_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fee numeric := coalesce(p_fee, 0);
begin
  if p_type = 'income' then
    if p_to_account_id is null or not exists (select 1 from accounts where id = p_to_account_id and user_id = p_user_id) then
      raise exception 'Income requires a destination account owned by the user.';
    end if;
    update accounts set current_balance = current_balance + (p_amount - v_fee) where id = p_to_account_id and user_id = p_user_id;
  elsif p_type = 'outcome' then
    if p_from_account_id is null or not exists (select 1 from accounts where id = p_from_account_id and user_id = p_user_id) then
      raise exception 'Outcome requires a source account owned by the user.';
    end if;
    update accounts set current_balance = current_balance - (p_amount + v_fee) where id = p_from_account_id and user_id = p_user_id;
  elsif p_type = 'transfer' then
    if p_from_account_id is null or p_to_account_id is null or p_from_account_id = p_to_account_id then
      raise exception 'Transfer requires two different accounts.';
    end if;
    if not exists (select 1 from accounts where id = p_from_account_id and user_id = p_user_id) or
       not exists (select 1 from accounts where id = p_to_account_id and user_id = p_user_id) then
      raise exception 'Transfer accounts must be owned by the user.';
    end if;
    update accounts set current_balance = current_balance - (p_amount + v_fee) where id = p_from_account_id and user_id = p_user_id;
    update accounts set current_balance = current_balance + p_amount where id = p_to_account_id and user_id = p_user_id;
  else
    raise exception 'Unsupported transaction type.';
  end if;
end;
$$;

-- Recreate apply_transaction with the fee parameter.
create or replace function apply_transaction(
  p_transaction_id uuid,
  p_user_id uuid,
  p_type text,
  p_amount numeric,
  p_category text,
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_transaction_date date,
  p_notes text,
  p_fee numeric default 0
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_transaction_id uuid;
  v_old_transaction transactions;
  v_fee numeric := coalesce(p_fee, 0);
begin
  if auth.uid() <> p_user_id then
    raise exception 'Unauthorized transaction mutation.';
  end if;
  if p_amount <= 0 then
    raise exception 'Amount must be greater than 0.';
  end if;
  if v_fee < 0 then
    raise exception 'Fee cannot be negative.';
  end if;

  if p_transaction_id is not null then
    select * into v_old_transaction from transactions where id = p_transaction_id and user_id = p_user_id for update;
    if not found then
      raise exception 'Transaction not found.';
    end if;
    perform reverse_transaction_balance(v_old_transaction);
    update transactions
    set type = p_type,
        amount = p_amount,
        fee = v_fee,
        category = p_category,
        from_account_id = p_from_account_id,
        to_account_id = p_to_account_id,
        transaction_date = p_transaction_date,
        notes = p_notes
    where id = p_transaction_id and user_id = p_user_id
    returning id into v_transaction_id;
  else
    insert into transactions(user_id, type, amount, fee, category, from_account_id, to_account_id, transaction_date, notes)
    values (p_user_id, p_type, p_amount, v_fee, p_category, p_from_account_id, p_to_account_id, p_transaction_date, p_notes)
    returning id into v_transaction_id;
  end if;

  perform apply_transaction_balance(p_user_id, p_type, p_amount, v_fee, p_from_account_id, p_to_account_id);
  return v_transaction_id;
end;
$$;

-------------------------------------------------------------------------------
-- 2. CONFIGURABLE REPORT SCHEDULE
-------------------------------------------------------------------------------
alter table profiles add column if not exists report_frequency text not null default 'weekly'
  check (report_frequency in ('daily', 'weekly', 'monthly'));
alter table profiles add column if not exists report_day text not null default 'sunday';
alter table profiles add column if not exists report_time text not null default '08:00';

-------------------------------------------------------------------------------
-- 3. EDITABLE TRANSACTION CATEGORIES
-------------------------------------------------------------------------------
create table if not exists transaction_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind text not null default 'all' check (kind in ('income', 'outcome', 'transfer', 'all')),
  created_at timestamptz default now(),
  unique (user_id, name)
);

create index if not exists transaction_categories_user_idx on transaction_categories(user_id);

alter table transaction_categories enable row level security;

drop policy if exists "Users can view own categories" on transaction_categories;
drop policy if exists "Users can insert own categories" on transaction_categories;
drop policy if exists "Users can update own categories" on transaction_categories;
drop policy if exists "Users can delete own categories" on transaction_categories;
create policy "Users can view own categories" on transaction_categories for select using (auth.uid() = user_id);
create policy "Users can insert own categories" on transaction_categories for insert with check (auth.uid() = user_id);
create policy "Users can update own categories" on transaction_categories for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own categories" on transaction_categories for delete using (auth.uid() = user_id);

-- Seed each existing user with the previous hard-coded defaults (only if they
-- have none yet). Safe to re-run.
insert into transaction_categories (user_id, name, kind)
select p.id, c.name, 'all'
from profiles p
cross join (values
  ('Skincare'), ('Snacks'), ('E-money Top Up'), ('Gojek'), ('Lunch'),
  ('Hangout with Friends'), ('Treat Parents'), ('Gift'), ('Subscription'),
  ('Clothes'), ('Other')
) as c(name)
where not exists (
  select 1 from transaction_categories tc where tc.user_id = p.id
)
on conflict (user_id, name) do nothing;
