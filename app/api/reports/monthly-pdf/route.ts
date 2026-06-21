import { endOfMonth, startOfMonth } from "date-fns";
import { NextResponse } from "next/server";
import { generateBudgetInsightFromData } from "@/lib/ai";
import { calculateMonthlyIncome, calculateMonthlyOutcome, calculateSavingsRatio, calculateSpendingByCategory } from "@/lib/calculations";
import { formatIDR, formatPercent } from "@/lib/formatters";
import { createSimplePdf } from "@/lib/pdf";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const monthStart = startOfMonth(now).toISOString().slice(0, 10);
  const monthEnd = endOfMonth(now).toISOString().slice(0, 10);

  const [accountsResult, transactionsResult, budgetsResult, subscriptionsResult, equityResult] = await Promise.all([
    supabase.from("accounts").select("*").eq("user_id", user.id),
    supabase.from("transactions").select("*").eq("user_id", user.id).gte("transaction_date", monthStart).lte("transaction_date", monthEnd),
    supabase.from("budgets").select("*").eq("user_id", user.id),
    supabase.from("subscriptions").select("*").eq("user_id", user.id),
    supabase.from("equity_assets").select("*").eq("user_id", user.id)
  ]);

  const accounts = accountsResult.data ?? [];
  const transactions = transactionsResult.data ?? [];
  const budgets = budgetsResult.data ?? [];
  const subscriptions = subscriptionsResult.data ?? [];
  const equityAssets = equityResult.data ?? [];
  const income = calculateMonthlyIncome(transactions, now);
  const outcome = calculateMonthlyOutcome(transactions, now);
  const insight = await generateBudgetInsightFromData({ accounts, transactions, budgets, subscriptions, equityAssets }, "monthly");
  const topCategories = calculateSpendingByCategory(transactions).slice(0, 5);

  const lines = [
    `Period: ${monthStart} to ${monthEnd}`,
    `Income: ${formatIDR(income)}`,
    `Outcome: ${formatIDR(outcome)}`,
    `Net savings: ${formatIDR(income - outcome)}`,
    `Savings rate: ${formatPercent(calculateSavingsRatio(income, outcome))}`,
    "",
    "Top spending categories:",
    ...topCategories.map((item, index) => `${index + 1}. ${item.category}: ${formatIDR(item.amount)}`),
    "",
    "Financial health:",
    `${insight.intelligence.financialHealthScore}/100 - ${insight.intelligence.financialHealthExplanation}`,
    "",
    "Cash flow forecast:",
    `Next 7 days: ${formatIDR(insight.intelligence.cashFlowForecast.next7Days)}`,
    `Next 30 days: ${formatIDR(insight.intelligence.cashFlowForecast.next30Days)}`,
    "",
    "AI recommendation:",
    insight.conclusion
  ];

  const pdf = createSimplePdf("Money Tracker Monthly Report", lines);

  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="money-tracker-monthly-report-${monthStart}.pdf"`
    }
  });
}
