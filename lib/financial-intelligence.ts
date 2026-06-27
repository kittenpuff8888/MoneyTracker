import { addDays, endOfMonth, isWithinInterval, parseISO, startOfMonth, subMonths } from "date-fns";
import {
  calculateBudgetUsage,
  calculateBurnRate,
  calculateMonthlyIncome,
  calculateMonthlyOutcome,
  calculateNetBalance,
  calculateSavingsRatio,
  calculateSpendingByCategory,
  detectOverspending
} from "@/lib/calculations";
import { formatIDR, formatPercent } from "@/lib/formatters";
import type { Account, Budget, EquityAsset, Subscription, Transaction } from "@/lib/types";

export type FinancialIntelligenceInput = {
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  subscriptions: Subscription[];
  equityAssets: EquityAsset[];
};

export type FinancialIntelligence = {
  financialHealthScore: number;
  financialHealthExplanation: string;
  spendingAnalysis: string[];
  overspendingWarnings: { category: string; increase: number; amount: number; message: string }[];
  savingsOpportunities: string[];
  categoryOptimizations: string[];
  nextWeekRecommendation: string;
  nextMonthRecommendation: string;
  cashFlowForecast: {
    next7Days: number;
    next30Days: number;
    explanation: string;
  };
  subscriptionWaste: string[];
  equitySummary: {
    invested: number;
    currentValue: number;
    gainLoss: number;
    gainLossPercent: number;
    explanation: string;
  };
};

export function generateFinancialIntelligence(input: FinancialIntelligenceInput): FinancialIntelligence {
  const { accounts, transactions, budgets, subscriptions, equityAssets } = input;
  const now = new Date();
  const income = calculateMonthlyIncome(transactions, now);
  const outcome = calculateMonthlyOutcome(transactions, now);
  const savingsRate = calculateSavingsRatio(income, outcome);
  const burnRate = calculateBurnRate(income, outcome);
  const budgetUsage = calculateBudgetUsage(budgets, transactions, now);
  const netBalance = calculateNetBalance(accounts);
  const subscriptionTotal = subscriptions.reduce((sum, item) => sum + Number(item.amount), 0);
  const subscriptionBurden = income > 0 ? (subscriptionTotal / income) * 100 : 0;
  const topCategories = calculateSpendingByCategory(transactions, startOfMonth(now), endOfMonth(now)).slice(0, 5);
  const overspending = detectOverspending(transactions, now).map((item) => ({
    ...item,
    message: `${item.category} increased by ${formatPercent(item.increase)} this week with ${formatIDR(item.amount)} spent.`
  }));
  const monthlyVolatility = calculateSpendingVolatility(transactions);
  const emergencyFundMonths = outcome > 0 ? netBalance / outcome : netBalance > 0 ? 6 : 0;
  const financialHealthScore = scoreFinancialHealth({
    savingsRate,
    budgetAdherence: budgetUsage.length ? budgetUsage.filter((item) => item.percentUsed <= 100).length / budgetUsage.length : 1,
    volatility: monthlyVolatility,
    emergencyFundMonths,
    subscriptionBurden
  });
  const equitySummary = summarizeEquity(equityAssets);
  const cashFlowForecast = forecastCashFlow({ netBalance, transactions, subscriptions });
  const highestCategory = topCategories[0];

  return {
    financialHealthScore,
    financialHealthExplanation: `Score is based on ${formatPercent(savingsRate)} savings rate, ${formatPercent(burnRate)} burn rate, ${emergencyFundMonths.toFixed(1)} months of balance coverage, budget adherence, spending volatility, and subscription burden.`,
    spendingAnalysis: topCategories.length
      ? topCategories.map((item) => `${item.category}: ${formatIDR(item.amount)} this month (${formatPercent(item.percent ?? 0)} of outcome).`)
      : ["No categorized spending yet. Add outcome transactions to generate spending analysis."],
    overspendingWarnings: overspending,
    savingsOpportunities: buildSavingsOpportunities({ highestCategory, subscriptionBurden, savingsRate }),
    categoryOptimizations: buildCategoryOptimizations(topCategories),
    nextWeekRecommendation: highestCategory
      ? `Reduce ${highestCategory.category} by 15% next week to save about ${formatIDR(highestCategory.amount * 0.15)}.`
      : "Add at least one week of transactions to generate a next-week recommendation.",
    nextMonthRecommendation: income > 0
      ? `Target ${formatIDR(income * 0.2)} for saving/investing next month and cap wants near ${formatIDR(income * 0.3)}.`
      : "Add income transactions so next-month recommendations can use your real earning pattern.",
    cashFlowForecast,
    subscriptionWaste: detectSubscriptionWaste({ subscriptions, income }),
    equitySummary
  };
}

function scoreFinancialHealth({
  savingsRate,
  budgetAdherence,
  volatility,
  emergencyFundMonths,
  subscriptionBurden
}: {
  savingsRate: number;
  budgetAdherence: number;
  volatility: number;
  emergencyFundMonths: number;
  subscriptionBurden: number;
}) {
  const savingsScore = Math.max(0, Math.min(savingsRate / 30, 1)) * 30;
  const budgetScore = budgetAdherence * 20;
  const volatilityScore = Math.max(0, 1 - volatility) * 15;
  const emergencyScore = Math.max(0, Math.min(emergencyFundMonths / 6, 1)) * 25;
  const subscriptionScore = Math.max(0, 1 - subscriptionBurden / 20) * 10;
  return Math.round(savingsScore + budgetScore + volatilityScore + emergencyScore + subscriptionScore);
}

function calculateSpendingVolatility(transactions: Transaction[]) {
  const months = Array.from({ length: 3 }).map((_, index) => subMonths(new Date(), index));
  const outcomes = months.map((month) => calculateMonthlyOutcome(transactions, month));
  const average = outcomes.reduce((sum, item) => sum + item, 0) / Math.max(outcomes.length, 1);
  if (average <= 0) return 0;
  const variance = outcomes.reduce((sum, item) => sum + Math.pow(item - average, 2), 0) / outcomes.length;
  return Math.sqrt(variance) / average;
}

function forecastCashFlow({
  netBalance,
  transactions,
  subscriptions
}: {
  netBalance: number;
  transactions: Transaction[];
  subscriptions: Subscription[];
}) {
  const dailyOutcomeAverage = averageDailyOutcome(transactions);
  const now = new Date();
  const next7SubscriptionCost = sumSubscriptionsDue(subscriptions, now, addDays(now, 7));
  const next30SubscriptionCost = sumSubscriptionsDue(subscriptions, now, addDays(now, 30));
  const next7Days = netBalance - dailyOutcomeAverage * 7 - next7SubscriptionCost;
  const next30Days = netBalance - dailyOutcomeAverage * 30 - next30SubscriptionCost;

  return {
    next7Days,
    next30Days,
    explanation: `Forecast uses current account balance, recent daily outcome average of ${formatIDR(dailyOutcomeAverage)}, and upcoming subscriptions.`
  };
}

function averageDailyOutcome(transactions: Transaction[]) {
  const since = addDays(new Date(), -30);
  const recent = transactions.filter((item) => item.type === "outcome" && new Date(item.transaction_date) >= since);
  const total = recent.reduce((sum, item) => sum + Number(item.amount), 0);
  return total / 30;
}

function sumSubscriptionsDue(subscriptions: Subscription[], start: Date, end: Date) {
  return subscriptions
    .filter((item) => isWithinInterval(parseISO(item.billing_date), { start, end }))
    .reduce((sum, item) => sum + Number(item.amount), 0);
}

function summarizeEquity(equityAssets: EquityAsset[]) {
  const invested = equityAssets.reduce((sum, item) => sum + Number(item.amount_invested), 0);
  const currentValue = equityAssets.reduce((sum, item) => sum + Number(item.current_value), 0);
  const gainLoss = currentValue - invested;
  const gainLossPercent = invested > 0 ? (gainLoss / invested) * 100 : 0;
  return {
    invested,
    currentValue,
    gainLoss,
    gainLossPercent,
    explanation: invested > 0
      ? `Portfolio is ${gainLoss >= 0 ? "up" : "down"} ${formatIDR(Math.abs(gainLoss))} (${formatPercent(Math.abs(gainLossPercent))}).`
      : "No equity positions have been added yet."
  };
}

function buildSavingsOpportunities({
  highestCategory,
  subscriptionBurden,
  savingsRate
}: {
  highestCategory?: { category: string; amount: number };
  subscriptionBurden: number;
  savingsRate: number;
}) {
  const opportunities = [];
  if (highestCategory) {
    opportunities.push(`Cutting ${highestCategory.category} by 20% would save about ${formatIDR(highestCategory.amount * 0.2)} monthly.`);
  }
  if (subscriptionBurden > 10) {
    opportunities.push(`Subscriptions are ${formatPercent(subscriptionBurden)} of income; review unused services.`);
  }
  if (savingsRate < 20) {
    opportunities.push("Raise savings rate toward 20% by reducing wants before increasing fixed commitments.");
  }
  return opportunities.length ? opportunities : ["Current spending pattern does not show a major savings leak yet."];
}

function buildCategoryOptimizations(topCategories: { category: string; amount: number }[]) {
  return topCategories.slice(0, 3).map((item) => (
    `${item.category}: test a 15% reduction target, saving roughly ${formatIDR(item.amount * 0.15)} per month.`
  ));
}

export function detectSubscriptionWaste({ subscriptions, income }: { subscriptions: Subscription[]; income: number }) {
  const duplicateNames = subscriptions
    .map((item) => item.name.toLowerCase())
    .filter((name, index, array) => array.indexOf(name) !== index);
  const total = subscriptions.reduce((sum, item) => sum + Number(item.amount), 0);
  const warnings = [];
  if (duplicateNames.length) warnings.push(`Potential duplicate subscriptions: ${Array.from(new Set(duplicateNames)).join(", ")}.`);
  if (income > 0 && total / income > 0.1) warnings.push(`Subscription burden is above 10% of income at ${formatIDR(total)} monthly.`);
  if (!warnings.length) warnings.push("No obvious subscription waste detected from current subscription records.");
  return warnings;
}
