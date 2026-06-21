create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  weekly_report_enabled boolean default true,
  weekly_report_day text default 'sunday',
  last_weekly_report_sent_at timestamptz,
  created_at timestamptz default now()
);

alter table profiles
add column if not exists last_weekly_report_sent_at timestamptz;

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null,
  starting_balance numeric default 0,
  current_balance numeric default 0,
  color text,
  icon text,
  created_at timestamptz default now()
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income', 'outcome', 'transfer')),
  amount numeric not null check (amount > 0),
  category text not null,
  from_account_id uuid references accounts(id),
  to_account_id uuid references accounts(id),
  notes text,
  transaction_date date not null default current_date,
  created_at timestamptz default now()
);

create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  monthly_limit numeric not null default 0,
  created_at timestamptz default now()
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount numeric not null,
  billing_date date not null,
  category text default 'Subscription',
  account_id uuid references accounts(id),
  frequency text default 'monthly',
  notes text,
  created_at timestamptz default now()
);

create table if not exists equity_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  symbol text,
  asset_type text not null,
  amount_invested numeric default 0,
  current_value numeric default 0,
  quantity numeric default 0,
  notes text,
  created_at timestamptz default now()
);

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric not null,
  current_amount numeric default 0,
  deadline date,
  created_at timestamptz default now()
);

create table if not exists email_report_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_type text not null default 'weekly',
  period_start date not null,
  period_end date not null,
  recipient_email text not null,
  status text not null check (status in ('sent', 'failed', 'skipped')),
  error_message text,
  resend_id text,
  attempts integer not null default 1,
  sent_at timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists accounts_user_id_idx on accounts(user_id);
create index if not exists transactions_user_id_date_idx on transactions(user_id, transaction_date desc);
create index if not exists budgets_user_id_idx on budgets(user_id);
create index if not exists subscriptions_user_id_billing_idx on subscriptions(user_id, billing_date);
create index if not exists equity_assets_user_id_idx on equity_assets(user_id);
create index if not exists goals_user_id_idx on goals(user_id);
create index if not exists email_report_logs_user_sent_idx on email_report_logs(user_id, sent_at desc);
create index if not exists email_report_logs_status_idx on email_report_logs(status);

alter table profiles enable row level security;
alter table accounts enable row level security;
alter table transactions enable row level security;
alter table budgets enable row level security;
alter table subscriptions enable row level security;
alter table equity_assets enable row level security;
alter table goals enable row level security;
alter table email_report_logs enable row level security;

drop policy if exists "Users can view own profile" on profiles;
drop policy if exists "Users can insert own profile" on profiles;
drop policy if exists "Users can update own profile" on profiles;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Users can view own accounts" on accounts;
drop policy if exists "Users can insert own accounts" on accounts;
drop policy if exists "Users can update own accounts" on accounts;
drop policy if exists "Users can delete own accounts" on accounts;
create policy "Users can view own accounts" on accounts for select using (auth.uid() = user_id);
create policy "Users can insert own accounts" on accounts for insert with check (auth.uid() = user_id);
create policy "Users can update own accounts" on accounts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own accounts" on accounts for delete using (auth.uid() = user_id);

drop policy if exists "Users can view own transactions" on transactions;
drop policy if exists "Users can insert own transactions" on transactions;
drop policy if exists "Users can update own transactions" on transactions;
drop policy if exists "Users can delete own transactions" on transactions;
create policy "Users can view own transactions" on transactions for select using (auth.uid() = user_id);
create policy "Users can insert own transactions" on transactions for insert with check (auth.uid() = user_id);
create policy "Users can update own transactions" on transactions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own transactions" on transactions for delete using (auth.uid() = user_id);

drop policy if exists "Users can view own budgets" on budgets;
drop policy if exists "Users can insert own budgets" on budgets;
drop policy if exists "Users can update own budgets" on budgets;
drop policy if exists "Users can delete own budgets" on budgets;
create policy "Users can view own budgets" on budgets for select using (auth.uid() = user_id);
create policy "Users can insert own budgets" on budgets for insert with check (auth.uid() = user_id);
create policy "Users can update own budgets" on budgets for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own budgets" on budgets for delete using (auth.uid() = user_id);

drop policy if exists "Users can view own subscriptions" on subscriptions;
drop policy if exists "Users can insert own subscriptions" on subscriptions;
drop policy if exists "Users can update own subscriptions" on subscriptions;
drop policy if exists "Users can delete own subscriptions" on subscriptions;
create policy "Users can view own subscriptions" on subscriptions for select using (auth.uid() = user_id);
create policy "Users can insert own subscriptions" on subscriptions for insert with check (auth.uid() = user_id);
create policy "Users can update own subscriptions" on subscriptions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own subscriptions" on subscriptions for delete using (auth.uid() = user_id);

drop policy if exists "Users can view own equity assets" on equity_assets;
drop policy if exists "Users can insert own equity assets" on equity_assets;
drop policy if exists "Users can update own equity assets" on equity_assets;
drop policy if exists "Users can delete own equity assets" on equity_assets;
create policy "Users can view own equity assets" on equity_assets for select using (auth.uid() = user_id);
create policy "Users can insert own equity assets" on equity_assets for insert with check (auth.uid() = user_id);
create policy "Users can update own equity assets" on equity_assets for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own equity assets" on equity_assets for delete using (auth.uid() = user_id);

drop policy if exists "Users can view own goals" on goals;
drop policy if exists "Users can insert own goals" on goals;
drop policy if exists "Users can update own goals" on goals;
drop policy if exists "Users can delete own goals" on goals;
create policy "Users can view own goals" on goals for select using (auth.uid() = user_id);
create policy "Users can insert own goals" on goals for insert with check (auth.uid() = user_id);
create policy "Users can update own goals" on goals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own goals" on goals for delete using (auth.uid() = user_id);

drop policy if exists "Users can view own email report logs" on email_report_logs;
drop policy if exists "Users can insert own email report logs" on email_report_logs;
create policy "Users can view own email report logs" on email_report_logs for select using (auth.uid() = user_id);
create policy "Users can insert own email report logs" on email_report_logs for insert with check (auth.uid() = user_id);

create or replace function reverse_transaction_balance(p_transaction transactions)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_transaction.type = 'income' then
    update accounts
    set current_balance = current_balance - p_transaction.amount
    where id = p_transaction.to_account_id and user_id = p_transaction.user_id;
  elsif p_transaction.type = 'outcome' then
    update accounts
    set current_balance = current_balance + p_transaction.amount
    where id = p_transaction.from_account_id and user_id = p_transaction.user_id;
  elsif p_transaction.type = 'transfer' then
    update accounts
    set current_balance = current_balance + p_transaction.amount
    where id = p_transaction.from_account_id and user_id = p_transaction.user_id;
    update accounts
    set current_balance = current_balance - p_transaction.amount
    where id = p_transaction.to_account_id and user_id = p_transaction.user_id;
  end if;
end;
$$;

create or replace function apply_transaction_balance(
  p_user_id uuid,
  p_type text,
  p_amount numeric,
  p_from_account_id uuid,
  p_to_account_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_type = 'income' then
    if p_to_account_id is null or not exists (select 1 from accounts where id = p_to_account_id and user_id = p_user_id) then
      raise exception 'Income requires a destination account owned by the user.';
    end if;
    update accounts set current_balance = current_balance + p_amount where id = p_to_account_id and user_id = p_user_id;
  elsif p_type = 'outcome' then
    if p_from_account_id is null or not exists (select 1 from accounts where id = p_from_account_id and user_id = p_user_id) then
      raise exception 'Outcome requires a source account owned by the user.';
    end if;
    update accounts set current_balance = current_balance - p_amount where id = p_from_account_id and user_id = p_user_id;
  elsif p_type = 'transfer' then
    if p_from_account_id is null or p_to_account_id is null or p_from_account_id = p_to_account_id then
      raise exception 'Transfer requires two different accounts.';
    end if;
    if not exists (select 1 from accounts where id = p_from_account_id and user_id = p_user_id) or
       not exists (select 1 from accounts where id = p_to_account_id and user_id = p_user_id) then
      raise exception 'Transfer accounts must be owned by the user.';
    end if;
    update accounts set current_balance = current_balance - p_amount where id = p_from_account_id and user_id = p_user_id;
    update accounts set current_balance = current_balance + p_amount where id = p_to_account_id and user_id = p_user_id;
  else
    raise exception 'Unsupported transaction type.';
  end if;
end;
$$;

create or replace function apply_transaction(
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
set search_path = public
as $$
declare
  v_transaction_id uuid;
  v_old_transaction transactions;
begin
  if auth.uid() <> p_user_id then
    raise exception 'Unauthorized transaction mutation.';
  end if;
  if p_amount <= 0 then
    raise exception 'Amount must be greater than 0.';
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
        category = p_category,
        from_account_id = p_from_account_id,
        to_account_id = p_to_account_id,
        transaction_date = p_transaction_date,
        notes = p_notes
    where id = p_transaction_id and user_id = p_user_id
    returning id into v_transaction_id;
  else
    insert into transactions(user_id, type, amount, category, from_account_id, to_account_id, transaction_date, notes)
    values (p_user_id, p_type, p_amount, p_category, p_from_account_id, p_to_account_id, p_transaction_date, p_notes)
    returning id into v_transaction_id;
  end if;

  perform apply_transaction_balance(p_user_id, p_type, p_amount, p_from_account_id, p_to_account_id);
  return v_transaction_id;
end;
$$;

create or replace function delete_transaction_and_rebalance(
  p_transaction_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_transaction transactions;
begin
  if auth.uid() <> p_user_id then
    raise exception 'Unauthorized transaction deletion.';
  end if;

  select * into v_old_transaction from transactions where id = p_transaction_id and user_id = p_user_id for update;
  if not found then
    raise exception 'Transaction not found.';
  end if;

  perform reverse_transaction_balance(v_old_transaction);
  delete from transactions where id = p_transaction_id and user_id = p_user_id;
end;
$$;
