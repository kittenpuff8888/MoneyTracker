import { endOfMonth, endOfWeek, format, isWithinInterval, parseISO, startOfMonth, startOfWeek, subMonths } from "date-fns";
import type { Account, Budget, EquityAsset, Subscription, Transaction } from "@/lib/types";

export type CategoryTotal = {
  category: string;
  amount: number;
  percent?: number;
};

export type BudgetUsage = {
  budget: Budget;
  spent: number;
  remaining: number;
  percentUsed: number;
  level: "safe" | "watch" | "warning" | "exceeded";
};

export function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export type WalletRollup = {
  income: number;
  expense: number;
};

// Income = money flowing into the wallet (income deposits + incoming transfers).
// Expense = money leaving the wallet (outcome + outgoing transfers) plus any fees
// charged on transactions the wallet pays for.
export function calculateWalletRollup(accountId: string, transactions: Transaction[]): WalletRollup {
  let income = 0;
  let expense = 0;
  for (const t of transactions) {
    const amount = toNumber(t.amount);
    const fee = toNumber((t as Transaction).fee);
    if (t.type === "income" && t.to_account_id === accountId) {
      income += amount;
      expense += fee; // fee on a deposit is debited from the receiving wallet
    } else if (t.type === "outcome" && t.from_account_id === accountId) {
      expense += amount + fee;
    } else if (t.type === "transfer") {
      if (t.from_account_id === accountId) expense += amount + fee;
      if (t.to_account_id === accountId) income += amount;
    }
  }
  return { income, expense };
}

export function calculateNetBalance(accounts: Account[]) {
  return accounts.reduce((sum, account) => sum + toNumber(account.current_balance), 0);
}

export function calculateMonthlyIncome(transactions: Transaction[], date = new Date()) {
  return sumTransactions(transactions, "income", startOfMonth(date), endOfMonth(date));
}

export function calculateMonthlyOutcome(transactions: Transaction[], date = new Date()) {
  return sumTransactions(transactions, "outcome", startOfMonth(date), endOfMonth(date));
}

export function calculatePreviousMonth(transactions: Transaction[], type: "income" | "outcome", date = new Date()) {
  const previous = subMonths(date, 1);
  return sumTransactions(transactions, type, startOfMonth(previous), endOfMonth(previous));
}

export function calculateSavingsRatio(income: number, outcome: number) {
  if (income <= 0) return 0;
  return ((income - outcome) / income) * 100;
}

export function calculateBurnRate(income: number, outcome: number) {
  if (income <= 0) return 0;
  return Math.min((outcome / income) * 100, 100);
}

export function calculateRemainingBalance(income: number, outcome: number) {
  return income - outcome;
}

export function calculateSpendingByCategory(transactions: Transaction[], start?: Date, end?: Date): CategoryTotal[] {
  const totals = new Map<string, number>();
  transactions
    .filter((transaction) => transaction.type === "outcome")
    .filter((transaction) => {
      if (!start || !end) return true;
      return isWithinInterval(parseISO(transaction.transaction_date), { start, end });
    })
    .forEach((transaction) => {
      totals.set(transaction.category, (totals.get(transaction.category) ?? 0) + toNumber(transaction.amount));
    });

  const grandTotal = Array.from(totals.values()).reduce((sum, amount) => sum + amount, 0);

  return Array.from(totals.entries())
    .map(([category, amount]) => ({
      category,
      amount,
      percent: grandTotal > 0 ? (amount / grandTotal) * 100 : 0
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function calculateBudgetUsage(budgets: Budget[], transactions: Transaction[], date = new Date()): BudgetUsage[] {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const spending = calculateSpendingByCategory(transactions, monthStart, monthEnd);

  return budgets.map((budget) => {
    const spent = spending.find((item) => item.category === budget.category)?.amount ?? 0;
    const limit = toNumber(budget.monthly_limit);
    const percentUsed = limit > 0 ? (spent / limit) * 100 : 0;
    const level = percentUsed >= 100 ? "exceeded" : percentUsed >= 90 ? "warning" : percentUsed >= 75 ? "watch" : "safe";
    return {
      budget,
      spent,
      remaining: Math.max(limit - spent, 0),
      percentUsed,
      level
    };
  });
}

export function calculateEquityGainLoss(asset: EquityAsset) {
  const amountInvested = toNumber(asset.amount_invested);
  const currentValue = toNumber(asset.current_value);
  const gainLoss = currentValue - amountInvested;
  const gainLossPercent = amountInvested > 0 ? (gainLoss / amountInvested) * 100 : 0;
  return { gainLoss, gainLossPercent };
}

export function detectOverspending(transactions: Transaction[], date = new Date()) {
  const thisWeek = calculateSpendingByCategory(
    transactions,
    startOfWeek(date, { weekStartsOn: 1 }),
    endOfWeek(date, { weekStartsOn: 1 })
  );
  const lastWeek = calculateSpendingByCategory(
    transactions,
    startOfWeek(new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000), { weekStartsOn: 1 }),
    endOfWeek(new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000), { weekStartsOn: 1 })
  );

  return thisWeek
    .map((current) => {
      const previous = lastWeek.find((item) => item.category === current.category)?.amount ?? 0;
      const increase = previous > 0 ? ((current.amount - previous) / previous) * 100 : current.amount > 0 ? 100 : 0;
      return { category: current.category, amount: current.amount, increase };
    })
    .filter((item) => item.increase >= 25)
    .sort((a, b) => b.increase - a.increase)
    .slice(0, 5);
}

export function getMonthlyTrend(transactions: Transaction[]) {
  const months = Array.from({ length: 6 }).map((_, index) => subMonths(new Date(), 5 - index));
  return months.map((month) => ({
    month: format(month, "MMM"),
    income: sumTransactions(transactions, "income", startOfMonth(month), endOfMonth(month)),
    outcome: sumTransactions(transactions, "outcome", startOfMonth(month), endOfMonth(month))
  }));
}

export function getUpcomingSubscriptions(subscriptions: Subscription[], limit = 5) {
  return [...subscriptions]
    .sort((a, b) => new Date(a.billing_date).getTime() - new Date(b.billing_date).getTime())
    .slice(0, limit);
}

function sumTransactions(transactions: Transaction[], type: "income" | "outcome", start: Date, end: Date) {
  return transactions
    .filter((transaction) => transaction.type === type)
    .filter((transaction) => isWithinInterval(parseISO(transaction.transaction_date), { start, end }))
    .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0);
}
