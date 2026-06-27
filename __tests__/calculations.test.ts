import { describe, expect, it } from "vitest";
import {
  calculateBudgetUsage,
  calculateBurnRate,
  calculateMonthlyIncome,
  calculateMonthlyOutcome,
  calculateNetBalance,
  calculateRemainingBalance,
  calculateSavingsRatio,
  calculateSpendingByCategory
} from "../lib/calculations";
import type { Account, Budget, Transaction } from "../lib/types";

const now = new Date();
const currentDate = now.toISOString().slice(0, 10);

const accounts = [
  { current_balance: 5_000_000 },
  { current_balance: 750_000 }
] as Account[];

const transactions = [
  { id: "1", type: "income", amount: 8_000_000, category: "Other", transaction_date: currentDate },
  { id: "2", type: "outcome", amount: 1_000_000, category: "Lunch", transaction_date: currentDate },
  { id: "3", type: "outcome", amount: 500_000, category: "Lunch", transaction_date: currentDate },
  { id: "4", type: "outcome", amount: 250_000, category: "Gojek", transaction_date: currentDate },
  { id: "5", type: "transfer", amount: 300_000, category: "Other", transaction_date: currentDate }
] as Transaction[];

describe("financial calculations", () => {
  it("calculates balances and monthly totals without counting transfers as income or outcome", () => {
    expect(calculateNetBalance(accounts)).toBe(5_750_000);
    expect(calculateMonthlyIncome(transactions, now)).toBe(8_000_000);
    expect(calculateMonthlyOutcome(transactions, now)).toBe(1_750_000);
    expect(calculateRemainingBalance(8_000_000, 1_750_000)).toBe(6_250_000);
  });

  it("calculates savings and burn-rate percentages", () => {
    expect(calculateSavingsRatio(8_000_000, 1_750_000)).toBeCloseTo(78.125);
    expect(calculateBurnRate(8_000_000, 1_750_000)).toBeCloseTo(21.875);
    expect(calculateSavingsRatio(0, 100)).toBe(0);
  });

  it("groups spending and evaluates budget thresholds", () => {
    const spending = calculateSpendingByCategory(transactions);
    expect(spending[0]).toMatchObject({ category: "Lunch", amount: 1_500_000 });

    const budgets = [
      { id: "b1", category: "Lunch", monthly_limit: 1_500_000 },
      { id: "b2", category: "Gojek", monthly_limit: 1_000_000 }
    ] as Budget[];
    const usage = calculateBudgetUsage(budgets, transactions, now);
    expect(usage[0]).toMatchObject({ percentUsed: 100, level: "exceeded", remaining: 0 });
    expect(usage[1]).toMatchObject({ percentUsed: 25, level: "safe", remaining: 750_000 });
  });
});
