export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type TransactionType = "income" | "outcome" | "transfer";
export type AccountType = "Bank" | "Cash" | "E-wallet" | "Investment" | "Savings" | "Other";
export type SubscriptionFrequency = "weekly" | "monthly" | "yearly" | "custom";
export type EquityAssetType = "Stock" | "ETF" | "Mutual Fund" | "Crypto" | "Bond" | "Cash" | "Other";

export const transactionCategories = [
  "Skincare",
  "Snacks",
  "E-money Top Up",
  "Gojek",
  "Lunch",
  "Hangout with Friends",
  "Treat Parents",
  "Gift",
  "Subscription",
  "Clothes",
  "Other"
] as const;

export type TransactionCategory = (typeof transactionCategories)[number];

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  weekly_report_enabled: boolean;
  weekly_report_day: string;
  last_weekly_report_sent_at: string | null;
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
  created_at: string;
};

export type Transaction = {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  category: string;
  from_account_id: string | null;
  to_account_id: string | null;
  notes: string | null;
  transaction_date: string;
  created_at: string;
};

export type Budget = {
  id: string;
  user_id: string;
  category: string;
  monthly_limit: number;
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

export type Goal = {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
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
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
