-- 8888 Tracker feature migration (additive & idempotent).
-- Safe to run on the live database. Adds:
--   1. accounts.card_info (free-text card number / notes)
--   2. "covering" transaction type (Cover Bill) + settle flow
--   3. goals.description + upsert_goal description param
--   4. adjust_account_balance RPC (wallet balance edits logged as Miscellaneous tx)
-- Run AFTER 006_transaction_name.sql.

-------------------------------------------------------------------------------
-- 1. WALLET CARD INFO
-------------------------------------------------------------------------------
alter table accounts add column if not exists card_info text;

-------------------------------------------------------------------------------
-- 2. COVERING ("Cover Bill") TRANSACTION TYPE
-------------------------------------------------------------------------------
alter table transactions
  add column if not exists covered_for text,
  add column if not exists is_settled boolean not null default false;

-- Allow the new type on the column check constraint.
alter table transactions drop constraint if exists transactions_type_check;
alter table transactions add constraint transactions_type_check
  check (type = any (array['income'::text, 'outcome'::text, 'transfer'::text, 'covering'::text]));

-- Covering debits the wallet exactly like an outcome.
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
  elsif p_type in ('outcome', 'covering') then
    if p_from_account_id is null or not exists (select 1 from accounts where id = p_from_account_id and user_id = p_user_id) then
      raise exception 'Outcome/covering requires a source account owned by the user.';
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
    update accounts set current_balance = current_balance - (p_transaction.amount - v_fee)
    where id = p_transaction.to_account_id and user_id = p_transaction.user_id;
  elsif p_transaction.type in ('outcome', 'covering') then
    update accounts set current_balance = current_balance + (p_transaction.amount + v_fee)
    where id = p_transaction.from_account_id and user_id = p_transaction.user_id;
  elsif p_transaction.type = 'transfer' then
    update accounts set current_balance = current_balance + (p_transaction.amount + v_fee)
    where id = p_transaction.from_account_id and user_id = p_transaction.user_id;
    update accounts set current_balance = current_balance - p_transaction.amount
    where id = p_transaction.to_account_id and user_id = p_transaction.user_id;
  end if;
end;
$$;

-- Store who the bill was covered for (called after apply_transaction).
create or replace function set_covering_info(p_id uuid, p_covered_for text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update transactions set covered_for = p_covered_for
  where id = p_id and user_id = auth.uid();
end;
$$;

revoke all on function set_covering_info(uuid, text) from public, anon;
grant execute on function set_covering_info(uuid, text) to authenticated;

-- Settle a covering: mark settled + credit the wallet back + record income row.
create or replace function settle_covering_transaction(p_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tx transactions;
begin
  if auth.uid() <> p_user_id then
    raise exception 'Unauthorized.';
  end if;

  select * into v_tx from transactions
  where id = p_id and user_id = p_user_id and type = 'covering' and is_settled = false
  for update;
  if not found then
    raise exception 'Covering transaction not found or already settled.';
  end if;

  update transactions set is_settled = true where id = p_id and user_id = p_user_id;

  update accounts set current_balance = current_balance + v_tx.amount
  where id = v_tx.from_account_id and user_id = p_user_id;

  insert into transactions (user_id, type, amount, fee, category, to_account_id, transaction_date, notes)
  values (p_user_id, 'income', v_tx.amount, 0, 'Financial', v_tx.from_account_id, current_date,
          'Settled: ' || coalesce(v_tx.covered_for, 'covering'));
end;
$$;

revoke all on function settle_covering_transaction(uuid, uuid) from public, anon;
grant execute on function settle_covering_transaction(uuid, uuid) to authenticated;

-------------------------------------------------------------------------------
-- 3. GOAL DESCRIPTION
-------------------------------------------------------------------------------
alter table goals add column if not exists description text;

-- Replace upsert_goal with a description-aware version (drop old overload first
-- to avoid an ambiguous-overload resolution error).
drop function if exists public.upsert_goal(uuid, text, uuid, text, numeric, date, date);

create or replace function public.upsert_goal(
  p_id uuid,
  p_name text,
  p_wallet_id uuid,
  p_category text,
  p_target numeric,
  p_start date,
  p_deadline date,
  p_description text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_uid uuid := auth.uid(); v_id uuid;
begin
  if v_uid is null then raise exception 'You must be logged in.'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'Goal name is required.'; end if;
  if p_id is null then
    insert into public.goals (user_id, name, wallet_id, category, target_amount, current_amount, start_date, deadline, description)
    values (v_uid, trim(p_name), p_wallet_id, p_category, coalesce(p_target, 0), 0, p_start, p_deadline, p_description)
    returning id into v_id;
  else
    update public.goals set
      name = trim(p_name), wallet_id = p_wallet_id, category = p_category,
      target_amount = coalesce(p_target, 0), start_date = p_start, deadline = p_deadline,
      description = p_description
    where id = p_id and user_id = v_uid
    returning id into v_id;
  end if;
  return v_id;
end; $$;

-------------------------------------------------------------------------------
-- 4. WALLET BALANCE ADJUSTMENT
-------------------------------------------------------------------------------
-- Edit a wallet's balance and log the +/- difference as a Miscellaneous tx so
-- the books stay consistent.
create or replace function public.adjust_account_balance(
  p_account_id uuid,
  p_new_balance numeric,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_old numeric;
  v_diff numeric;
begin
  if auth.uid() <> p_user_id then
    raise exception 'Unauthorized.';
  end if;

  select current_balance into v_old
  from accounts where id = p_account_id and user_id = p_user_id
  for update;
  if not found then
    raise exception 'Wallet not found.';
  end if;

  v_diff := coalesce(p_new_balance, 0) - coalesce(v_old, 0);
  if v_diff = 0 then
    return;
  end if;

  update accounts set current_balance = p_new_balance
  where id = p_account_id and user_id = p_user_id;

  if v_diff > 0 then
    insert into transactions (user_id, type, amount, fee, category, to_account_id, transaction_date, notes)
    values (p_user_id, 'income', v_diff, 0, 'Miscellaneous', p_account_id, current_date, 'Balance adjustment');
  else
    insert into transactions (user_id, type, amount, fee, category, from_account_id, transaction_date, notes)
    values (p_user_id, 'outcome', abs(v_diff), 0, 'Miscellaneous', p_account_id, current_date, 'Balance adjustment');
  end if;
end; $$;

revoke all on function public.adjust_account_balance(uuid, numeric, uuid) from public, anon;
grant execute on function public.adjust_account_balance(uuid, numeric, uuid) to authenticated;
