import { subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { createClient as createSupabaseJsClient, type SupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import {
  calculateMonthlyIncome,
  calculateMonthlyOutcome,
  calculateSavingsRatio,
  calculateSpendingByCategory,
  detectOverspending
} from "@/lib/calculations";
import { formatIDR, formatPercent } from "@/lib/formatters";
import type { Budget, Database, Subscription } from "@/lib/types";

export type BudgetInsight = {
  conclusion: string;
  recommendedBudget: {
    needs: number;
    wants: number;
    savingsInvesting: number;
  };
  topCategories: { category: string; amount: number }[];
  savingsRate: number;
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
  const { transactions, budgets, subscriptions } = await fetchFinanceData(supabase, userId);

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

  const fallback = buildFallbackInsight({ income, outcome, savingsRate, topCategories, unusual, subscriptions, budgets });

  if (!process.env.AI_API_KEY) return fallback;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
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
  }
}

async function fetchFinanceData(supabase: SupabaseClient<Database>, userId: string) {
  const since = subDays(new Date(), 120).toISOString().slice(0, 10);
  const [transactionsResult, budgetsResult, subscriptionsResult] = await Promise.all([
    supabase.from("transactions").select("*").eq("user_id", userId).gte("transaction_date", since).order("transaction_date", { ascending: false }),
    supabase.from("budgets").select("*").eq("user_id", userId),
    supabase.from("subscriptions").select("*").eq("user_id", userId).order("billing_date", { ascending: true })
  ]);

  return {
    transactions: transactionsResult.data ?? [],
    budgets: budgetsResult.data ?? [],
    subscriptions: subscriptionsResult.data ?? []
  };
}

function buildFallbackInsight({
  income,
  outcome,
  savingsRate,
  topCategories,
  unusual,
  subscriptions,
  budgets
}: {
  income: number;
  outcome: number;
  savingsRate: number;
  topCategories: { category: string; amount: number }[];
  unusual: string[];
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

  return {
    conclusion: `${base} Income is ${formatIDR(income)}, outcome is ${formatIDR(outcome)}, and savings rate is ${formatPercent(savingsRate)}. ${unusualText} ${focus} ${subscriptionLine} ${budgetLine} Recommended allocation: 50% needs, 30% wants, 20% saving/investing.`,
    recommendedBudget: {
      needs: income * 0.5,
      wants: income * 0.3,
      savingsInvesting: income * 0.2
    },
    topCategories,
    savingsRate
  };
}
