export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type TransactionType = "income" | "outcome" | "transfer" | "covering";
export type AccountType =
  | "Bank"
  | "Cash"
  | "E-wallet"
  | "E-Money"
  | "Investment"
  | "Savings"
  | "Other";
export type SubscriptionFrequency = "weekly" | "monthly" | "yearly" | "custom";
export type EquityAssetType = "Stock" | "ETF" | "Mutual Fund" | "Crypto" | "Bond" | "Cash" | "Other";

export const transactionCategories = [
  "Food & Dining",
  "Housing",
  "Transportation",
  "Health & Wellness",
  "Personal & Shopping",
  "Entertainment & Leisure",
  "Subscriptions & Digital Services",
  "Financial",
  "Education & Career",
  "Family & Pets",
  "Gifts & Donations",
  "Miscellaneous"
] as const;

export type TransactionCategory = (typeof transactionCategories)[number];

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  weekly_report_enabled: boolean;
  weekly_report_day: string;
  report_frequency: ReportFrequency | string;
  report_day: string;
  report_time: string;
  pay_day: number;
  last_weekly_report_sent_at: string | null;
  created_at: string;
};

export type ReportFrequency = "daily" | "weekly" | "monthly";

export type TransactionCategoryRow = {
  id: string;
  user_id: string;
  name: string;
  kind: "income" | "outcome" | "transfer" | "all";
  sort_order: number;
  created_at: string;
};

export type Account = {
  id: string;
  user_id: string;
  name: string;
  type: AccountType | string;
  starting_balance: number;
  current_balance: number;
  color: string | null;
  icon: string | null;
  card_info: string | null;
  created_at: string;
};

export type Transaction = {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  fee: number;
  category: string;
  name: string | null;
  from_account_id: string | null;
  to_account_id: string | null;
  notes: string | null;
  covered_for: string | null;
  is_settled: boolean;
  transaction_date: string;
  created_at: string;
};

export type Budget = {
  id: string;
  user_id: string;
  category: string;
  monthly_limit: number;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
};

export type Subscription = {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  billing_date: string;
  category: string;
  account_id: string | null;
  frequency: SubscriptionFrequency | string;
  notes: string | null;
  created_at: string;
};

export type EquityAsset = {
  id: string;
  user_id: string;
  name: string;
  symbol: string | null;
  asset_type: EquityAssetType | string;
  amount_invested: number;
  current_value: number;
  quantity: number;
  notes: string | null;
  created_at: string;
};

export type TradeStatus = "open" | "realized";

export type RealizedTrade = {
  id: string;
  user_id: string;
  wallet_id: string | null;
  ordered_item: string;
  status: TradeStatus;
  entry_price: number;
  exit_price: number | null;
  lot: number;
  price: number;
  amount_done: number;
  total_fee: number;
  net_amount: number;
  realized_pnl: number;
  trade_date: string;
  created_at: string;
};

export type Goal = {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  wallet_id: string | null;
  category: string | null;
  start_date: string | null;
  deadline: string | null;
  created_at: string;
};

export type EmailReportLog = {
  id: string;
  user_id: string;
  report_type: string;
  period_start: string;
  period_end: string;
  recipient_email: string;
  status: "processing" | "sent" | "failed" | "skipped";
  error_message: string | null;
  resend_id: string | null;
  attempts: number;
  sent_at: string | null;
  created_at: string;
};

export type FinancialAuditLog = {
  id: string;
  user_id: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  entity_type: string;
  entity_id: string;
  created_at: string;
};

export type MonthlySummary = {
  user_id: string;
  month: string;
  total_income: number;
  total_outcome: number;
  net_saved: number;
};

export type CategoryMonthlySpending = {
  user_id: string;
  month: string;
  category: string;
  total_spent: number;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Omit<Profile, "created_at">> & { id: string };
        Update: Partial<Omit<Profile, "id" | "created_at">>;
        Relationships: [];
      };
      accounts: {
        Row: Account;
        Insert: Partial<Omit<Account, "id" | "created_at">> & { user_id: string; name: string; type: string };
        Update: Partial<Omit<Account, "id" | "user_id" | "created_at">>;
        Relationships: [];
      };
      transactions: {
        Row: Transaction;
        Insert: Partial<Omit<Transaction, "id" | "created_at">> & {
          user_id: string;
          type: TransactionType;
          amount: number;
          category: string;
          transaction_date: string;
        };
        Update: Partial<Omit<Transaction, "id" | "user_id" | "created_at">>;
        Relationships: [];
      };
      budgets: {
        Row: Budget;
        Insert: Partial<Omit<Budget, "id" | "created_at">> & { user_id: string; category: string; monthly_limit: number };
        Update: Partial<Omit<Budget, "id" | "user_id" | "created_at">>;
        Relationships: [];
      };
      subscriptions: {
        Row: Subscription;
        Insert: Partial<Omit<Subscription, "id" | "created_at">> & { user_id: string; name: string; amount: number; billing_date: string };
        Update: Partial<Omit<Subscription, "id" | "user_id" | "created_at">>;
        Relationships: [];
      };
      equity_assets: {
        Row: EquityAsset;
        Insert: Partial<Omit<EquityAsset, "id" | "created_at">> & { user_id: string; name: string; asset_type: string };
        Update: Partial<Omit<EquityAsset, "id" | "user_id" | "created_at">>;
        Relationships: [];
      };
      goals: {
        Row: Goal;
        Insert: Partial<Omit<Goal, "id" | "created_at">> & { user_id: string; name: string; target_amount: number };
        Update: Partial<Omit<Goal, "id" | "user_id" | "created_at">>;
        Relationships: [];
      };
      email_report_logs: {
        Row: EmailReportLog;
        Insert: Partial<Omit<EmailReportLog, "id" | "created_at">> & {
          user_id: string;
          period_start: string;
          period_end: string;
          recipient_email: string;
          status: "processing" | "sent" | "failed" | "skipped";
        };
        Update: Partial<Omit<EmailReportLog, "id" | "user_id" | "created_at">>;
        Relationships: [];
      };
      financial_audit_logs: {
        Row: FinancialAuditLog;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      transaction_categories: {
        Row: TransactionCategoryRow;
        Insert: Partial<Omit<TransactionCategoryRow, "id" | "created_at">> & { user_id: string; name: string };
        Update: Partial<Omit<TransactionCategoryRow, "id" | "user_id" | "created_at">>;
        Relationships: [];
      };
      realized_trades: {
        Row: RealizedTrade;
        Insert: Partial<Omit<RealizedTrade, "id" | "created_at">> & { user_id: string; ordered_item: string };
        Update: Partial<Omit<RealizedTrade, "id" | "user_id" | "created_at">>;
        Relationships: [];
      };
    };
    Views: {
      monthly_summary: {
        Row: MonthlySummary;
        Relationships: [];
      };
      category_monthly_spending: {
        Row: CategoryMonthlySpending;
        Relationships: [];
      };
    };
    Functions: {
      apply_transaction: {
        Args: {
          p_transaction_id?: string | null;
          p_user_id: string;
          p_type: TransactionType;
          p_amount: number;
          p_fee?: number;
          p_category: string;
          p_from_account_id?: string | null;
          p_to_account_id?: string | null;
          p_transaction_date: string;
          p_notes?: string | null;
        };
        Returns: string;
      };
      delete_transaction_and_rebalance: {
        Args: {
          p_transaction_id: string;
          p_user_id: string;
        };
        Returns: void;
      };
      consume_ai_quota: {
        Args: Record<never, never>;
        Returns: boolean;
      };
      sync_profile_from_auth: {
        Args: Record<never, never>;
        Returns: void;
      };
      add_category: {
        Args: { p_name: string; p_kind?: string };
        Returns: string;
      };
      rename_category: {
        Args: { p_id: string; p_name: string };
        Returns: void;
      };
      delete_category: {
        Args: { p_id: string };
        Returns: void;
      };
      seed_default_categories: {
        Args: { p_user: string };
        Returns: void;
      };
      upsert_goal: {
        Args: {
          p_id: string | null;
          p_name: string;
          p_wallet_id: string | null;
          p_category: string | null;
          p_target: number;
          p_start: string | null;
          p_deadline: string | null;
        };
        Returns: string;
      };
      delete_goal: {
        Args: { p_id: string };
        Returns: void;
      };
      set_transaction_name: {
        Args: { p_id: string; p_name: string | null };
        Returns: void;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
