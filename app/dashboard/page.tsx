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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  calculateBudgetUsage,
  calculateBurnRate,
  calculateMonthlyIncome,
  calculateMonthlyOutcome,
  calculateNetBalance,
  calculateRemainingBalance,
  calculateSavingsRatio,
  calculateSpendingByCategory,
  detectOverspending,
  getMonthlyTrend,
  getUpcomingSubscriptions
} from "@/lib/calculations";
import { formatIDR, formatPercent } from "@/lib/formatters";
import { generateBudgetInsight } from "@/lib/ai";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [profileResult, accountsResult, transactionsResult, budgetsResult, subscriptionsResult, goalsResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("accounts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("transactions").select("*").eq("user_id", user.id).order("transaction_date", { ascending: false }),
    supabase.from("budgets").select("*").eq("user_id", user.id),
    supabase.from("subscriptions").select("*").eq("user_id", user.id).order("billing_date", { ascending: true }),
    supabase.from("goals").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
  ]);

  const profile = profileResult.data;
  const accounts = accountsResult.data ?? [];
  const transactions = transactionsResult.data ?? [];
  const budgets = budgetsResult.data ?? [];
  const subscriptions = subscriptionsResult.data ?? [];
  const goals = goalsResult.data ?? [];

  const income = calculateMonthlyIncome(transactions);
  const outcome = calculateMonthlyOutcome(transactions);
  const netBalance = calculateNetBalance(accounts);
  const savingsRatio = calculateSavingsRatio(income, outcome);
  const burnRate = calculateBurnRate(income, outcome);
  const remaining = calculateRemainingBalance(income, outcome);
  const budgetUsage = calculateBudgetUsage(budgets, transactions);
  const warnings = budgetUsage.filter((item) => item.percentUsed >= 75);
  const overspending = detectOverspending(transactions);
  const spending = calculateSpendingByCategory(transactions);
  const trend = getMonthlyTrend(transactions);
  const upcomingSubscriptions = getUpcomingSubscriptions(subscriptions, 4);
  const insight = await generateBudgetInsight(user.id, "monthly");

  return (
    <DashboardShell profile={profile}>
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">Good evening, {profile?.full_name ?? user.email}</p>
        <h1 className="mt-1 text-3xl font-bold">Dashboard</h1>
      </div>

      {accounts.length === 0 && transactions.length === 0 ? (
        <EmptyState title="Welcome to Money Tracker." description="Add your first account and transaction to generate your dashboard." />
      ) : (
        <div className="grid gap-5 xl:grid-cols-12">
          <div className="grid gap-5 xl:col-span-9">
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              <StatCard title="Net Balance" value={formatIDR(netBalance)} icon={<Wallet size={18} />} badge="SAFE" badgeTone="green" helper="You are on track to grow your savings this month.">
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground"><span>Burn Rate</span><span>{formatPercent(burnRate)}</span></div>
                  <div className="mt-2 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-sky-500" style={{ width: `${burnRate}%` }} /></div>
                </div>
              </StatCard>
              <StatCard title="Income" value={formatIDR(income)} icon={<ArrowDownLeft size={18} />} badge="+2% vs last month" badgeTone="green" />
              <StatCard title="Outcome" value={formatIDR(outcome)} icon={<ArrowUpRight size={18} />} badge="-4% vs last month" badgeTone="orange" />
              <StatCard title="Savings Ratio" value={formatPercent(savingsRatio)} icon={<PiggyBank size={18} />} badge="+4% vs last month" badgeTone="green" />
              <StatCard title="Remaining Balance" value={formatIDR(remaining)} icon={<Banknote size={18} />} helper="Safe until next payday" />
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
              <CardContent><FinancialHealthGauge score={savingsRatio} /></CardContent>
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
