import { endOfMonth, format, parseISO, startOfMonth, subMonths } from "date-fns";
import { ArrowDownLeft, ArrowUpRight, Banknote, Flame, PiggyBank, Wallet } from "lucide-react";
import { redirect } from "next/navigation";
import { BudgetWarningCard } from "@/components/cards/BudgetWarningCard";
import { InsightCard } from "@/components/cards/InsightCard";
import { StatCard } from "@/components/cards/StatCard";
import { SubscriptionCard } from "@/components/cards/SubscriptionCard";
import { FinancialHealthGauge } from "@/components/charts/FinancialHealthGauge";
import { IncomeOutcomeChart } from "@/components/charts/IncomeOutcomeChart";
import { SpendingBreakdownChart } from "@/components/charts/SpendingBreakdownChart";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { DateRangeControl } from "@/components/dashboard/DateRangeControl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  calculateBudgetUsage,
  calculateBurnRate,
  calculateNetBalance,
  calculateRemainingBalance,
  calculateSavingsRatio,
  calculateSpendingByCategory,
  detectOverspending,
  getUpcomingSubscriptions,
  sumTransactionsInRange
} from "@/lib/calculations";
import { formatIDR, formatPercent } from "@/lib/formatters";
import { generateBudgetInsightFromData } from "@/lib/ai";
import { createClient } from "@/lib/supabase/server";

function isValidDate(value: string | undefined): value is string {
  return Boolean(value) && /^\d{4}-\d{2}-\d{2}$/.test(value as string);
}

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const sp = await searchParams;
  const now = new Date();
  const defaultFrom = format(startOfMonth(now), "yyyy-MM-dd");
  const defaultTo = format(endOfMonth(now), "yyyy-MM-dd");
  const from = isValidDate(sp.from) ? sp.from : defaultFrom;
  const to = isValidDate(sp.to) ? sp.to : defaultTo;
  const fromDate = parseISO(from);
  const toDate = parseISO(to);

  const sixMonthsAgo = format(startOfMonth(subMonths(now, 5)), "yyyy-MM-dd");
  const [profileResult, accountsResult, transactionsResult, budgetsResult, subscriptionsResult, goalsResult, equityResult, monthlyResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("accounts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("transactions").select("*").eq("user_id", user.id).order("transaction_date", { ascending: false }),
    supabase.from("budgets").select("*").eq("user_id", user.id),
    supabase.from("subscriptions").select("*").eq("user_id", user.id).order("billing_date", { ascending: true }),
    supabase.from("goals").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("equity_assets").select("*").eq("user_id", user.id),
    supabase.from("monthly_summary").select("*").eq("user_id", user.id).gte("month", sixMonthsAgo).order("month", { ascending: true })
  ]);

  const profile = profileResult.data;
  const accounts = accountsResult.data ?? [];
  const transactions = transactionsResult.data ?? [];
  const budgets = budgetsResult.data ?? [];
  const subscriptions = subscriptionsResult.data ?? [];
  const goals = goalsResult.data ?? [];
  const equityAssets = equityResult.data ?? [];
  const monthlyRows = monthlyResult.data ?? [];

  const income = sumTransactionsInRange(transactions, "income", fromDate, toDate);
  const outcome = sumTransactionsInRange(transactions, "outcome", fromDate, toDate);

  const lengthMs = toDate.getTime() - fromDate.getTime();
  const prevTo = new Date(fromDate.getTime() - 24 * 60 * 60 * 1000);
  const prevFrom = new Date(prevTo.getTime() - lengthMs);
  const previousIncome = sumTransactionsInRange(transactions, "income", prevFrom, prevTo);
  const previousOutcome = sumTransactionsInRange(transactions, "outcome", prevFrom, prevTo);

  const netBalance = calculateNetBalance(accounts);
  const savingsRatio = calculateSavingsRatio(income, outcome);
  const previousSavingsRatio = calculateSavingsRatio(previousIncome, previousOutcome);
  const burnRate = calculateBurnRate(income, outcome);
  const remaining = calculateRemainingBalance(income, outcome);
  const budgetUsage = calculateBudgetUsage(budgets, transactions);
  const warnings = budgetUsage.filter((item) => item.percentUsed >= 75);
  const overspending = detectOverspending(transactions);
  const spending = calculateSpendingByCategory(transactions, fromDate, toDate);

  const trend = Array.from({ length: 6 }, (_, index) => {
    const month = startOfMonth(subMonths(now, 5 - index));
    const key = format(month, "yyyy-MM-dd");
    const summary = monthlyRows.find((row) => row.month === key);
    return {
      month: format(month, "MMM"),
      income: Number(summary?.total_income ?? 0),
      outcome: Number(summary?.total_outcome ?? 0)
    };
  });
  const upcomingSubscriptions = getUpcomingSubscriptions(subscriptions, 4);
  const insight = await generateBudgetInsightFromData({ accounts, transactions, budgets, subscriptions, equityAssets }, "monthly");
  const incomeChange = percentChange(income, previousIncome);
  const outcomeChange = percentChange(outcome, previousOutcome);
  const savingsChange = pointChange(savingsRatio, previousSavingsRatio);

  return (
    <DashboardShell profile={profile}>
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">Welcome back, {profile?.full_name ?? user.email}</p>
        <h1 className="mt-1 text-3xl font-bold">Dashboard</h1>
      </div>

      <div className="mb-5">
        <DateRangeControl from={from} to={to} />
      </div>

      {accounts.length === 0 && transactions.length === 0 ? (
        <EmptyState title="Welcome to 8888 Tracker." description="Add your first wallet and transaction to generate your dashboard." />
      ) : (
        <div className="grid gap-5 xl:grid-cols-12">
          <div className="grid gap-5 xl:col-span-9">
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              <StatCard
                title="Net Balance"
                value={formatIDR(netBalance)}
                icon={<Wallet size={18} />}
                badge={netBalance >= 0 ? "POSITIVE" : "NEGATIVE"}
                badgeTone={netBalance >= 0 ? "green" : "orange"}
                helper={netBalance >= 0 ? "Combined balance across your wallets." : "Your combined wallet balance is below zero."}
              >
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground"><span>Burn Rate</span><span>{formatPercent(burnRate)}</span></div>
                  <div className="mt-2 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-sky-500" style={{ width: `${burnRate}%` }} /></div>
                </div>
              </StatCard>
              <StatCard title="Income" value={formatIDR(income)} icon={<ArrowDownLeft size={18} />} badge={incomeChange.label} badgeTone={incomeChange.tone} />
              <StatCard title="Outcome" value={formatIDR(outcome)} icon={<ArrowUpRight size={18} />} badge={outcomeChange.label} badgeTone={outcomeChange.value <= 0 ? "green" : "orange"} />
              <StatCard title="Savings Ratio" value={formatPercent(savingsRatio)} icon={<PiggyBank size={18} />} badge={savingsChange.label} badgeTone={savingsChange.tone} />
              <StatCard title="Remaining Balance" value={formatIDR(remaining)} icon={<Banknote size={18} />} helper="Income minus outcome in range" />
              <StatCard title="Burn Rate" value={formatPercent(burnRate)} icon={<Flame size={18} />} helper="Outcome divided by income" />
            </div>

            <Card>
              <CardHeader><CardTitle>Income vs Outcome Chart</CardTitle></CardHeader>
              <CardContent><IncomeOutcomeChart data={trend} /></CardContent>
            </Card>

            <div className="grid gap-5 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Overspending</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {overspending.length === 0 ? <p className="text-sm text-muted-foreground">No overspending spikes yet.</p> : overspending.map((item) => (
                    <p key={item.category} className="text-sm">{item.category} increased <span className="font-semibold text-red-600">{formatPercent(item.increase)}</span> this week.</p>
                  ))}
                </CardContent>
              </Card>
              <BudgetWarningCard warnings={warnings} />
            </div>
          </div>

          <aside className="grid gap-5 xl:col-span-3">
            <InsightCard insight={insight.conclusion} />
            <SubscriptionCard subscriptions={upcomingSubscriptions} />
            <Card>
              <CardHeader><CardTitle>Spending Breakdown</CardTitle></CardHeader>
              <CardContent><SpendingBreakdownChart data={spending} /></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Financial Health</CardTitle></CardHeader>
              <CardContent><FinancialHealthGauge score={insight.intelligence.financialHealthScore} /><p className="mt-4 text-sm leading-6 text-muted-foreground">{insight.intelligence.financialHealthExplanation}</p></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Cash Flow Forecast</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span>Next 7 days</span><strong>{formatIDR(insight.intelligence.cashFlowForecast.next7Days)}</strong></div>
                <div className="flex justify-between"><span>Next 30 days</span><strong>{formatIDR(insight.intelligence.cashFlowForecast.next30Days)}</strong></div>
                <p className="leading-6 text-muted-foreground">{insight.intelligence.cashFlowForecast.explanation}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Goal Tracker</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {goals.length === 0 ? <p className="text-sm text-muted-foreground">No goals yet.</p> : goals.map((goal) => (
                  <div key={goal.id}>
                    <div className="flex justify-between text-sm"><span>{goal.name}</span><span>{formatIDR(goal.current_amount)} / {formatIDR(goal.target_amount)}</span></div>
                    <div className="mt-2 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-sky-500" style={{ width: `${Math.min((Number(goal.current_amount) / Number(goal.target_amount)) * 100, 100)}%` }} /></div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Recent Transaction History</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {transactions.slice(0, 5).map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between gap-3 text-sm">
                    <div><p className="font-medium">{transaction.category}</p><p className="text-xs text-muted-foreground">{transaction.transaction_date}</p></div>
                    <p className="font-semibold">{formatIDR(transaction.amount)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </aside>
        </div>
      )}
    </DashboardShell>
  );
}

function percentChange(current: number, previous: number): {
  value: number;
  label: string;
  tone: "green" | "orange";
} {
  if (previous <= 0) {
    return {
      value: current > 0 ? 100 : 0,
      label: current > 0 ? "New this period" : "No prior-period data",
      tone: current > 0 ? "green" : "orange"
    };
  }
  const value = ((current - previous) / previous) * 100;
  return {
    value,
    label: `${value >= 0 ? "+" : ""}${Math.round(value)}% vs prev period`,
    tone: value >= 0 ? "green" : "orange"
  };
}

function pointChange(current: number, previous: number): {
  label: string;
  tone: "green" | "orange";
} {
  if (previous === 0 && current === 0) {
    return { label: "No prior-period data", tone: "orange" };
  }
  const value = current - previous;
  return {
    label: `${value >= 0 ? "+" : ""}${Math.round(value)} pts vs prev period`,
    tone: value >= 0 ? "green" : "orange"
  };
}
