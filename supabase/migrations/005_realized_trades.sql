-- Investment Portfolio: realized trades log, linked to Investment-type wallets.
create table if not exists realized_trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wallet_id uuid references accounts(id) on delete set null,
  ordered_item text not null,
  lot numeric not null default 0,
  price numeric not null default 0,
  amount_done numeric not null default 0,
  total_fee numeric not null default 0,
  net_amount numeric not null default 0,
  realized_pnl numeric not null default 0,
  trade_date date not null default current_date,
  created_at timestamptz default now()
);

create index if not exists realized_trades_user_date_idx on realized_trades(user_id, trade_date desc);
create index if not exists realized_trades_wallet_idx on realized_trades(wallet_id);

alter table realized_trades enable row level security;

drop policy if exists "Users can view own trades" on realized_trades;
drop policy if exists "Users can insert own trades" on realized_trades;
drop policy if exists "Users can update own trades" on realized_trades;
drop policy if exists "Users can delete own trades" on realized_trades;
create policy "Users can view own trades" on realized_trades for select using (auth.uid() = user_id);
create policy "Users can insert own trades" on realized_trades for insert with check (auth.uid() = user_id);
create policy "Users can update own trades" on realized_trades for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own trades" on realized_trades for delete using (auth.uid() = user_id);
