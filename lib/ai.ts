import { subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
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

const AIOutputSchema = z.object({
  insights: z.array(z.string().min(1).max(180)).min(3).max(5),
  score: z.number().min(0).max(100).optional(),
  warnings: z.array(z.string().min(1).max(180)).max(3).optional()
});

export async function generateBudgetInsight(
  supabase: SupabaseClient<Database>,
  userId: string,
  period: "weekly" | "monthly"
): Promise<BudgetInsight> {
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

  const fallback = buildFallbackInsight({ period, income, outcome, savingsRate, topCategories, unusual, overspendingWarnings, intelligence, subscriptions, budgets });

  const financeContext = {
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
    budgets: budgets.map((budget) => ({ category: budget.category, monthlyLimit: Number(budget.monthly_limit) })),
    subscriptions: subscriptions.map((subscription) => ({
      name: subscription.name, amount: Number(subscription.amount), category: subscription.category,
      billingDate: subscription.billing_date, frequency: subscription.frequency
    })),
    recentTransactions: periodTransactions.slice(0, 25).map((transaction) => ({
      type: transaction.type, amount: Number(transaction.amount), category: transaction.category, date: transaction.transaction_date
    })),
    subscriptionsTotal: subscriptions.reduce((sum, item) => sum + Number(item.amount), 0)
  };

  const systemPrompt = [
    "You create concise, personal-finance insights in clear, natural English.",
    "Use only the supplied user's financial data and format money as IDR (e.g. Rp 1.250.000).",
    "Never invent transactions or amounts.",
    "Return valid JSON with 3-5 short insights and optional warnings.",
    "Do not include markdown or prose outside the JSON object."
  ].join(" ");

  if (!options.useExternalAi) return fallback;

  // Provider order: Gemini (has a free tier) → Anthropic → OpenAI → computed fallback.
  if (process.env.GEMINI_API_KEY) {
    const lines = await callGemini(systemPrompt, financeContext);
    if (lines) return { ...fallback, conclusion: lines.map((line) => `- ${line}`).join("\n") };
    return fallback;
  }

  if (process.env.ANTHROPIC_API_KEY) {
    const lines = await callAnthropic(systemPrompt, financeContext);
    if (lines) return { ...fallback, conclusion: lines.map((line) => `- ${line}`).join("\n") };
    return fallback;
  }

  if (!process.env.AI_API_KEY) return fallback;

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
            content: systemPrompt
          },
          {
            role: "user",
            content: JSON.stringify({
              requiredOutput: {
                insights: ["3-5 actionable strings grounded in the supplied data"],
                score: "optional number from 0 to 100",
                warnings: ["optional warning strings"]
              },
              financeContext: {
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
                  date: transaction.transaction_date
                })),
                subscriptionsTotal: subscriptions.reduce((sum, item) => sum + Number(item.amount), 0)
              }
            })
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 300
      })
    });

    if (!response.ok) return fallback;
    const json = await response.json();
    const text = json.choices?.[0]?.message?.content as string | undefined;
    if (!text) return fallback;
    const parsed = AIOutputSchema.safeParse(JSON.parse(text));
    if (!parsed.success) return fallback;
    const lines = [...parsed.data.insights, ...(parsed.data.warnings ?? [])].slice(0, 5);
    return { ...fallback, conclusion: lines.map((line) => `- ${line}`).join("\n") };
  } catch {
    return fallback;
  } finally {
    clearTimeout(timeout);
  }
}

// Call Google Gemini (free tier via Google AI Studio) for grounded insights.
// Returns the insight lines, or null on any error so the caller uses its fallback.
async function callGemini(systemPrompt: string, financeContext: unknown): Promise<string[] | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        signal: controller.signal,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: `${systemPrompt} Respond with ONLY a JSON object of the form {"insights": string[], "warnings"?: string[]}.` }] },
          contents: [{ role: "user", parts: [{ text: JSON.stringify({ financeContext }) }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.3, maxOutputTokens: 500 }
        })
      }
    );
    if (!response.ok) return null;
    const json = await response.json();
    const text: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = AIOutputSchema.safeParse(JSON.parse(match ? match[0] : text));
    if (!parsed.success) return null;
    return [...parsed.data.insights, ...(parsed.data.warnings ?? [])].slice(0, 5);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// Call Anthropic Claude (latest fast model) for grounded insights. Returns the
// insight lines, or null on any error so the caller can use its fallback.
async function callAnthropic(systemPrompt: string, financeContext: unknown): Promise<string[] | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY as string,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5",
        max_tokens: 400,
        system: `${systemPrompt} Respond with ONLY a JSON object of the form {"insights": string[], "warnings"?: string[]}.`,
        messages: [{ role: "user", content: JSON.stringify({ financeContext }) }]
      })
    });
    if (!response.ok) return null;
    const json = await response.json();
    const text: string | undefined = json?.content?.find((part: { type: string }) => part.type === "text")?.text;
    if (!text) return null;
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = AIOutputSchema.safeParse(JSON.parse(match ? match[0] : text));
    if (!parsed.success) return null;
    return [...parsed.data.insights, ...(parsed.data.warnings ?? [])].slice(0, 5);
  } catch {
    return null;
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
  period,
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
  period: "weekly" | "monthly";
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
  const subscriptionTotal = subscriptions.reduce((sum, subscription) => sum + Number(subscription.amount), 0);
  const lines = [
    `Income ${formatIDR(income)}, expenses ${formatIDR(outcome)}, savings ratio ${formatPercent(savingsRate)}.`,
    highest
      ? `Your largest spend is ${highest} at ${formatIDR(topCategories[0]?.amount ?? 0)}.`
      : "Add categorized transactions to sharpen your spending analysis.",
    unusual.length
      ? `${unusual.join(", ")} rose compared with your earlier spending pattern.`
      : `Your current financial health score is ${intelligence.financialHealthScore}/100.`,
    subscriptionTotal > income * 0.15 && income > 0
      ? `Subscriptions reach ${formatIDR(subscriptionTotal)}; review services you rarely use.`
      : budgets.length
        ? "Budget limits are active and ready to flag overspending risk."
        : "Create category budgets to get alerts at 75%, 90%, and 100% usage.",
    period === "weekly"
      ? intelligence.nextWeekRecommendation
      : intelligence.nextMonthRecommendation
  ];

  return {
    conclusion: lines.map((line) => `- ${line}`).join("\n"),
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
