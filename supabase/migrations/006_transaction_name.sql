-- Add optional name/merchant field to transactions (additive, safe to run on live DB).
alter table transactions
  add column if not exists name text;
