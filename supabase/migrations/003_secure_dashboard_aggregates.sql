-- RLS-aware dashboard aggregates. Views execute with the caller's permissions.

create or replace view public.monthly_summary
with (security_invoker = true)
as
select
  user_id,
  date_trunc('month', transaction_date)::date as month,
  sum(case when type = 'income' then amount else 0 end) as total_income,
  sum(case when type = 'outcome' then amount else 0 end) as total_outcome,
  sum(
    case
      when type = 'income' then amount
      when type = 'outcome' then -amount
      else 0
    end
  ) as net_saved
from public.transactions
group by user_id, date_trunc('month', transaction_date)::date;

create or replace view public.category_monthly_spending
with (security_invoker = true)
as
select
  user_id,
  date_trunc('month', transaction_date)::date as month,
  category,
  sum(amount) as total_spent
from public.transactions
where type = 'outcome'
group by user_id, date_trunc('month', transaction_date)::date, category;

revoke all privileges on public.monthly_summary from public, anon;
revoke all privileges on public.category_monthly_spending from public, anon;
grant select on public.monthly_summary to authenticated;
grant select on public.category_monthly_spending to authenticated;

create index if not exists transactions_user_type_date_idx
  on public.transactions(user_id, type, transaction_date desc);
