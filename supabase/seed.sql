-- Development seed examples only.
-- Replace the UUID below with an authenticated test user id from Supabase Auth.
-- Do not run these inserts for production users without changing the user id.

-- Example:
-- select id, email from auth.users order by created_at desc limit 5;

-- \set test_user_id '00000000-0000-0000-0000-000000000000'

-- insert into accounts (user_id, name, type, starting_balance, current_balance, color, icon) values
-- (:test_user_id, 'Main Wallet', 'Cash', 1200000, 1200000, '#38bdf8', 'wallet'),
-- (:test_user_id, 'Bank Account', 'Bank', 15000000, 15000000, '#0ea5e9', 'banknote'),
-- (:test_user_id, 'E-wallet', 'E-wallet', 750000, 750000, '#22c55e', 'credit-card');

-- insert into transactions (user_id, type, amount, category, from_account_id, to_account_id, transaction_date, notes) values
-- (:test_user_id, 'income', 4800000, 'Other', null, '<bank-account-id>', current_date, 'Monthly income'),
-- (:test_user_id, 'outcome', 320000, 'Gojek', '<ewallet-id>', null, current_date, 'Transport'),
-- (:test_user_id, 'transfer', 500000, 'E-money Top Up', '<bank-account-id>', '<ewallet-id>', current_date, 'Top up');

-- insert into budgets (user_id, category, monthly_limit) values
-- (:test_user_id, 'Gojek', 700000),
-- (:test_user_id, 'Lunch', 1200000),
-- (:test_user_id, 'Subscription', 300000);

-- insert into subscriptions (user_id, name, amount, billing_date, category, account_id, frequency, notes) values
-- (:test_user_id, 'Spotify Premium', 10990, current_date + interval '3 days', 'Subscription', '<bank-account-id>', 'monthly', 'Music'),
-- (:test_user_id, 'Google Drive Storage', 29000, current_date + interval '8 days', 'Subscription', '<bank-account-id>', 'monthly', 'Storage');

-- insert into equity_assets (user_id, name, symbol, asset_type, amount_invested, current_value, quantity, notes) values
-- (:test_user_id, 'BBCA', 'BBCA.JK', 'Stock', 5000000, 5400000, 100, 'Bank stock'),
-- (:test_user_id, 'Money Market Fund', 'MMF', 'Mutual Fund', 3000000, 3100000, 1, 'Low risk');

-- insert into goals (user_id, name, target_amount, current_amount, deadline) values
-- (:test_user_id, 'Reserve', 10000000, 7000000, current_date + interval '6 months'),
-- (:test_user_id, 'Travel', 4000000, 2500000, current_date + interval '4 months');
