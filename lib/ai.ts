import { subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { createClient as createSupabaseJsClient, type SupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { generateFinancialIntelligence, type FinancialIntelligence } from "@/lib/financial-intelligence";
import {
  calculateMonthlyIncome,
  calculateMonthlyOutcome,
  calculateSavingsRatio,
  calculateSpendingByCategory,
  detectOverspending
} from "@/lib/calculations";
import { formatIDR, formatPercent } from "@/lib/formatters";
import type { Account, Budget, Database, EquityAsset, Subscription, Transaction } from "@/lib/types";

export type BudgetInsight = {
  conclusion: string;
  recommendedBudget: {
    needs: number;
    wants: number;
    savingsInvesting: number;
  };
  topCategories: { category: string; amount: number }[];
  overspendingWarnings: { category: string; increase: number; amount: number }[];
  intelligence: FinancialIntelligence;
  savingsRate: number;
};

type FinanceData = {
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  subscriptions: Subscription[];
  equityAssets: EquityAsset[];
};

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseJsClient<Database>(url, key, {
    auth: { persistSession: false }
  });
}

export async function generateBudgetInsight(userId: string, period: "weekly" | "monthly"): Promise<BudgetInsight> {
  const supabase = createServiceClient() ?? (await createServerSupabase());
  const financeData = await fetchFinanceData(supabase, userId);
  return generateBudgetInsightFromData(financeData, period, { useExternalAi: true });
}

export async function generateBudgetInsightFromData(
  { accounts, transactions, budgets, subscriptions, equityAssets }: FinanceData,
  period: "weekly" | "monthly",
  options: { useExternalAi?: boolean } = {}
): Promise<BudgetInsight> {
  const now = new Date();
  const start = period === "weekly" ? startOfWeek(now, { weekStartsOn: 1 }) : startOfMonth(now);
  const end = period === "weekly" ? endOfWeek(now, { weekStartsOn: 1 }) : endOfMonth(now);
  const periodTransactions = transactions.filter((transaction) => {
    const date = new Date(transaction.transaction_date);
    return date >= start && date <= end;
  });

  const income = period === "monthly"
    ? calculateMonthlyIncome(transactions, now)
    : periodTransactions.filter((item) => item.type === "income").reduce((sum, item) => sum + Number(item.amount), 0);
  const outcome = period === "monthly"
    ? calculateMonthlyOutcome(transactions, now)
    : periodTransactions.filter((item) => item.type === "outcome").reduce((sum, item) => sum + Number(item.amount), 0);
  const savingsRate = calculateSavingsRatio(income, outcome);
  const topCategories = calculateSpendingByCategory(periodTransactions).slice(0, 5);
  const unusual = detectOverspending(transactions).map((item) => item.category).slice(0, 3);
  const overspendingWarnings = detectOverspending(transactions).slice(0, 5);
  const intelligence = generateFinancialIntelligence({ accounts, transactions, budgets, subscriptions, equityAssets });

  const fallback = buildFallbackInsight({ income, outcome, savingsRate, topCategories, unusual, overspendingWarnings, intelligence, subscriptions, budgets });

  if (!options.useExternalAi || !process.env.AI_API_KEY) return fallback;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.AI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You write concise, practical personal-finance recommendations for Indonesian users. Use IDR formatting and never mention USD."
          },
          {
            role: "user",
            content: JSON.stringify({
              period,
              income,
              outcome,
              savingsRate,
              topCategories,
              unusual,
              overspendingWarnings,
              financialHealthScore: intelligence.financialHealthScore,
              financialHealthExplanation: intelligence.financialHealthExplanation,
              spendingAnalysis: intelligence.spendingAnalysis,
              savingsOpportunities: intelligence.savingsOpportunities,
              categoryOptimizations: intelligence.categoryOptimizations,
              cashFlowForecast: intelligence.cashFlowForecast,
              subscriptionWaste: intelligence.subscriptionWaste,
              equitySummary: intelligence.equitySummary,
              nextWeekRecommendation: intelligence.nextWeekRecommendation,
              nextMonthRecommendation: intelligence.nextMonthRecommendation,
              budgets: budgets.map((budget) => ({
                category: budget.category,
                monthlyLimit: Number(budget.monthly_limit)
              })),
              subscriptions: subscriptions.map((subscription) => ({
                name: subscription.name,
                amount: Number(subscription.amount),
                category: subscription.category,
                billingDate: subscription.billing_date,
                frequency: subscription.frequency
              })),
              recentTransactions: periodTransactions.slice(0, 25).map((transaction) => ({
                type: transaction.type,
                amount: Number(transaction.amount),
                category: transaction.category,
                date: transaction.transaction_date,
                notes: transaction.notes
              })),
              subscriptionsTotal: subscriptions.reduce((sum, item) => sum + Number(item.amount), 0)
            })
          }
        ],
        temperature: 0.3,
        max_tokens: 180
      })
    });

    if (!response.ok) return fallback;
    const json = await response.json();
    const text = json.choices?.[0]?.message?.content as string | undefined;
    if (!text) return fallback;
    return { ...fallback, conclusion: text.trim() };
  } catch {
    return fallback;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchFinanceData(supabase: SupabaseClient<Database>, userId: string): Promise<FinanceData> {
  const since = subDays(new Date(), 120).toISOString().slice(0, 10);
  const [accountsResult, transactionsResult, budgetsResult, subscriptionsResult, equityResult] = await Promise.all([
    supabase.from("accounts").select("*").eq("user_id", userId),
    supabase.from("transactions").select("*").eq("user_id", userId).gte("transaction_date", since).order("transaction_date", { ascending: false }),
    supabase.from("budgets").select("*").eq("user_id", userId),
    supabase.from("subscriptions").select("*").eq("user_id", userId).order("billing_date", { ascending: true }),
    supabase.from("equity_assets").select("*").eq("user_id", userId)
  ]);

  return {
    accounts: accountsResult.data ?? [],
    transactions: transactionsResult.data ?? [],
    budgets: budgetsResult.data ?? [],
    subscriptions: subscriptionsResult.data ?? [],
    equityAssets: equityResult.data ?? []
  };
}

function buildFallbackInsight({
  income,
  outcome,
  savingsRate,
  topCategories,
  unusual,
  overspendingWarnings,
  intelligence,
  subscriptions,
  budgets
}: {
  income: number;
  outcome: number;
  savingsRate: number;
  topCategories: { category: string; amount: number }[];
  unusual: string[];
  overspendingWarnings: { category: string; increase: number; amount: number }[];
  intelligence: FinancialIntelligence;
  subscriptions: Subscription[];
  budgets: Budget[];
}): BudgetInsight {
  const highest = topCategories[0]?.category;
  const unusualText = unusual.length ? `${unusual.join(", ")} increased recently.` : "No unusual spending spikes were detected.";
  const subscriptionTotal = subscriptions.reduce((sum, subscription) => sum + Number(subscription.amount), 0);
  const base = savingsRate >= 20
    ? "Your budgeting is stable this period."
    : "Your savings rate is below the 20% target this period.";
  const focus = highest ? `Keep ${highest} under control and reduce it by 15% next week.` : "Add more categorized transactions to unlock sharper recommendations.";
  const subscriptionLine = subscriptionTotal > income * 0.15 && income > 0
    ? "Your subscription cost is increasing; review unused services."
    : "Subscription costs look manageable.";
  const budgetLine = budgets.length ? "Your budget limits are active and ready for weekly monitoring." : "Create category budgets to receive 75%, 90%, and 100% usage warnings.";
  const intelligenceLine = [
    `Financial health score is ${intelligence.financialHealthScore}/100.`,
    intelligence.spendingAnalysis[0],
    intelligence.savingsOpportunities[0],
    intelligence.cashFlowForecast.explanation,
    intelligence.equitySummary.explanation
  ].filter(Boolean).join(" ");

  return {
    conclusion: `${base} Income is ${formatIDR(income)}, outcome is ${formatIDR(outcome)}, and savings rate is ${formatPercent(savingsRate)}. ${unusualText} ${focus} ${subscriptionLine} ${budgetLine} ${intelligenceLine} Recommended allocation: 50% needs, 30% wants, 20% saving/investing.`,
    recommendedBudget: {
      needs: income * 0.5,
      wants: income * 0.3,
      savingsInvesting: income * 0.2
    },
    topCategories,
    overspendingWarnings,
    intelligence,
    savingsRate
  };
}
