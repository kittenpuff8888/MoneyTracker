import { endOfMonth, format, parseISO, startOfMonth, subMonths } from "date-fns";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  PiggyBank,
  TrendingUp
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { InsightCard } from "@/components/cards/InsightCard";
import { IncomeOutcomeChart } from "@/components/charts/IncomeOutcomeChart";
import { SpendingBreakdownChart } from "@/components/charts/SpendingBreakdownChart";
import { DateRangeControl } from "@/components/dashboard/DateRangeControl";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  calculateBudgetUsage,
  calculateBurnRate,
  calculateNetBalance,
  calculateRemainingBalance,
  calculateSavingsRatio,
  calculateSpendingByCategory,
  getUpcomingSubscriptions,
  sumTransactionsInRange
} from "@/lib/calculations";
import { formatIDR, formatPercent } from "@/lib/formatters";
import { generateBudgetInsightFromData } from "@/lib/ai";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

function isValidDate(v: string | undefined): v is string {
  return Boolean(v) && /^\d{4}-\d{2}-\d{2}$/.test(v as string);
}

function percentChange(current: number, previous: number) {
  if (previous <= 0) return { value: 0, label: "New this period", pos: true };
  const v = ((current - previous) / previous) * 100;
  return { value: v, label: `${v >= 0 ? "+" : ""}${Math.round(v)}% vs prev`, pos: v >= 0 };
}
function pointChange(current: number, previous: number) {
  const v = current - previous;
  return { label: `${v >= 0 ? "+" : ""}${Math.round(v)} pts vs prev`, pos: v >= 0 };
}

/* ── Small stat card ── */
function StatTile({
  label,
  value,
  icon,
  badge,
  pos,
  helper
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  badge?: string;
  pos?: boolean;
  helper?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="eyebrow">{label}</p>
          <div className="rounded-lg bg-muted p-2 text-muted-foreground">{icon}</div>
        </div>
        <p className="num-balance num mt-3 text-xl font-bold">{value}</p>
        {badge && (
          <span className={cn(
            "mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
            pos == null ? "bg-muted text-muted-foreground" : pos ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"
          )}>
            {badge}
          </span>
        )}
        {helper && <p className="mt-1 text-xs text-muted-foreground">{helper}</p>}
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const sp = await searchParams;
  const now = new Date();
  const defaultFrom = format(startOfMonth(now), "yyyy-MM-dd");
  const defaultTo = format(endOfMonth(now), "yyyy-MM-dd");
  const from = isValidDate(sp.from) ? sp.from : defaultFrom;
  const to = isValidDate(sp.to) ? sp.to : defaultTo;
  const fromDate = parseISO(from);
  const toDate = parseISO(to);

  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const rangeLabel =
    format(fromDate, "yyyy") === format(toDate, "yyyy")
      ? `${format(fromDate, "d")}–${format(toDate, "d MMM yyyy")}`
      : `${format(fromDate, "d MMM yyyy")} – ${format(toDate, "d MMM yyyy")}`;

  const sixMonthsAgoDate = startOfMonth(subMonths(now, 5));
  const sixMonthsAgo = format(sixMonthsAgoDate, "yyyy-MM-dd");
  const rangeLengthMs = toDate.getTime() - fromDate.getTime();
  const prevPeriodStart = new Date(fromDate.getTime() - 24 * 60 * 60 * 1000 - rangeLengthMs);
  const fetchStart = format(
    new Date(Math.min(prevPeriodStart.getTime(), sixMonthsAgoDate.getTime())),
    "yyyy-MM-dd"
  );

  const [profileResult, accountsResult, transactionsResult, budgetsResult, subscriptionsResult, goalsResult, equityResult, monthlyResult] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("accounts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("transactions").select("*").eq("user_id", user.id).gte("transaction_date", fetchStart).order("transaction_date", { ascending: false }).limit(5000),
      supabase.from("budgets").select("*").eq("user_id", user.id),
      supabase.from("subscriptions").select("*").eq("user_id", user.id).order("billing_date", { ascending: true }),
      supabase.from("goals").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("equity_assets").select("*").eq("user_id", user.id),
      supabase.from("monthly_summary").select("*").eq("user_id", user.id).gte("month", sixMonthsAgo).order("month", { ascending: true })
    ]);

  const profile = profileResult.data;
  const firstName = (profile?.full_name ?? user.email ?? "there").split(" ")[0];
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
  const spending = calculateSpendingByCategory(transactions, fromDate, toDate);

  const trend = Array.from({ length: 6 }, (_, i) => {
    const month = startOfMonth(subMonths(now, 5 - i));
    const key = format(month, "yyyy-MM-dd");
    const summary = monthlyRows.find((row) => row.month === key);
    return {
      month: format(month, "MMM"),
      income: Number(summary?.total_income ?? 0),
      outcome: Number(summary?.total_outcome ?? 0)
    };
  });

  const upcomingSubscriptions = getUpcomingSubscriptions(subscriptions, 4);
  const insight = await generateBudgetInsightFromData(
    { accounts, transactions, budgets, subscriptions, equityAssets },
    "monthly"
  );

  const incomeChange = percentChange(income, previousIncome);
  const outcomeChange = percentChange(outcome, previousOutcome);
  const savingsChange = pointChange(savingsRatio, previousSavingsRatio);

  const recentTransactions = transactions.slice(0, 8);

  return (
    <DashboardShell profile={profile}>
      {/* Page header */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {greeting}, {firstName}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {rangeLabel} · figures update with date range.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/transactions"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-foreground px-4 text-xs font-semibold text-card transition hover:opacity-90"
          >
            <ArrowUpRight size={14} /> Add Expense
          </Link>
          <Link
            href="/transactions"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-4 text-xs font-semibold text-foreground transition hover:bg-muted"
          >
            <ArrowDownLeft size={14} /> Add Income
          </Link>
        </div>
      </div>

      {/* Date range */}
      <div className="mb-5 rounded-xl border border-border bg-card px-4 py-2.5">
        <DateRangeControl from={from} to={to} />
      </div>

      {accounts.length === 0 && transactions.length === 0 ? (
        <EmptyState title="Welcome to 8888 Tracker." description="Add your first wallet and transaction to generate your dashboard." />
      ) : (
        <div className="grid gap-5 xl:grid-cols-12">
          {/* Main content */}
          <div className="grid gap-5 xl:col-span-8">
            {/* Stat row */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {/* Net Balance card — spans full width on xl */}
              <Card className="sm:col-span-2 xl:col-span-1">
                <CardContent className="flex h-full flex-col p-5">
                  <p className="eyebrow">Net Balance</p>
                  <p className="num-balance num mt-2 text-3xl font-bold">{formatIDR(netBalance)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {netBalance >= 0 ? "Combined balance across your wallets." : "Your combined wallet balance is below zero."}
                  </p>
                  {/* Burn rate bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Burn rate</span>
                      <span className="num font-medium">{formatPercent(burnRate)}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-1.5 rounded-full bg-primary transition-all"
                        style={{ width: `${burnRate}%` }}
                      />
                    </div>
                  </div>
                  <p className="mt-auto pt-4 text-xs text-muted-foreground">
                    {burnRate < 80 ? "You are on track to grow savings this period." : "Spending is high this period — review your budget."}
                  </p>
                </CardContent>
              </Card>

              <StatTile
                label="Income"
                value={formatIDR(income)}
                icon={<ArrowDownLeft size={16} />}
                badge={incomeChange.label}
                pos={incomeChange.pos}
              />
              <StatTile
                label="Expense"
                value={formatIDR(outcome)}
                icon={<ArrowUpRight size={16} />}
                badge={outcomeChange.label}
                pos={!outcomeChange.pos}
              />
              <StatTile
                label="Savings Ratio"
                value={formatPercent(savingsRatio)}
                icon={<PiggyBank size={16} />}
                badge={savingsChange.label}
                pos={savingsChange.pos}
              />
              <StatTile
                label="Remaining"
                value={formatIDR(remaining)}
                icon={<Banknote size={16} />}
                helper="Income minus expense in range"
              />
            </div>

            {/* Income vs Expense chart */}
            <Card>
              <CardHeader>
                <CardTitle>Income vs Expense</CardTitle>
              </CardHeader>
              <CardContent>
                <IncomeOutcomeChart data={trend} />
              </CardContent>
            </Card>

            {/* Spending Breakdown */}
            <Card>
              <CardHeader><CardTitle>Spending Breakdown</CardTitle></CardHeader>
              <CardContent>
                <SpendingBreakdownChart data={spending} />
              </CardContent>
            </Card>

            {/* Recent Transactions table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Transactions</CardTitle>
                <Link href="/transactions" className="text-xs font-medium text-primary hover:underline">
                  View all
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                {recentTransactions.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-muted-foreground">No transactions in this range.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {recentTransactions.map((t) => (
                      <div key={t.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{t.name || t.category}</p>
                          <p className="text-xs text-muted-foreground">{t.transaction_date} · {t.category}</p>
                        </div>
                        <p className={cn(
                          "num-balance num shrink-0 font-semibold",
                          t.type === "income" ? "text-emerald-600" : t.type === "outcome" ? "text-red-600" : "text-foreground"
                        )}>
                          {t.type === "outcome" ? "−" : t.type === "income" ? "+" : ""}{formatIDR(t.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right sidebar */}
          <aside className="grid auto-rows-min gap-5 xl:col-span-4">
            {/* AI Insights */}
            <InsightCard insight={insight.conclusion} />

            {/* Budget Warnings */}
            {warnings.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Budget Warnings</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {warnings.map((item) => (
                    <div key={item.budget.id} className="flex items-start gap-3 rounded-xl border border-border bg-muted p-3">
                      <AlertTriangle size={15} className="mt-0.5 shrink-0 text-warning" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{item.budget.category}</p>
                        <p className="text-xs text-muted-foreground">
                          <span className="num font-semibold text-foreground">{formatPercent(item.percentUsed)}</span> used ·{" "}
                          {formatIDR(item.remaining)} left
                        </p>
                        <div className="mt-2 h-1 overflow-hidden rounded-full bg-border">
                          <div
                            className={cn(
                              "h-1 rounded-full",
                              item.percentUsed >= 100 ? "bg-danger" : item.percentUsed >= 90 ? "bg-warning" : "bg-amber-400"
                            )}
                            style={{ width: `${Math.min(item.percentUsed, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Cash Flow Forecast */}
            <Card>
              <CardHeader><CardTitle>Cash Flow Forecast</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Next 7 days</span>
                  <strong className="num-balance num">{formatIDR(insight.intelligence.cashFlowForecast.next7Days)}</strong>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Next 30 days</span>
                  <strong className="num-balance num">{formatIDR(insight.intelligence.cashFlowForecast.next30Days)}</strong>
                </div>
                <p className="text-xs text-muted-foreground">{insight.intelligence.cashFlowForecast.explanation}</p>
              </CardContent>
            </Card>

            {/* Upcoming Subscriptions */}
            {upcomingSubscriptions.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Upcoming Bills</CardTitle></CardHeader>
                <CardContent className="divide-y divide-border p-0">
                  {upcomingSubscriptions.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                      <div>
                        <p className="font-medium">{sub.name}</p>
                        <p className="text-xs text-muted-foreground">{sub.billing_date}</p>
                      </div>
                      <p className="num-balance num font-semibold text-red-600">−{formatIDR(sub.amount)}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Goals */}
            {goals.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Goals</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {goals.map((goal) => {
                    const pct = Math.min((Number(goal.current_amount) / Number(goal.target_amount)) * 100, 100);
                    return (
                      <div key={goal.id}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{goal.name}</span>
                          <span className="num-balance num text-xs text-muted-foreground">
                            {formatIDR(goal.current_amount)} / {formatIDR(goal.target_amount)}
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div className="h-1.5 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Equity */}
            {equityAssets.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Investments</CardTitle></CardHeader>
                <CardContent className="divide-y divide-border p-0">
                  {equityAssets.slice(0, 5).map((a) => {
                    const gl = Number(a.current_value) - Number(a.amount_invested);
                    return (
                      <div key={a.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                        <div>
                          <p className="font-medium">{a.name}</p>
                          <p className="text-xs text-muted-foreground">{a.asset_type}</p>
                        </div>
                        <div className="text-right">
                          <p className="num-balance num font-semibold">{formatIDR(Number(a.current_value))}</p>
                          <p className={cn("num text-xs font-medium", gl >= 0 ? "text-emerald-600" : "text-red-600")}>
                            {gl >= 0 ? "+" : ""}{formatIDR(gl)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div className="px-5 py-2">
                    <Link href="/equity" className="text-xs font-medium text-primary hover:underline">
                      <TrendingUp size={12} className="mr-1 inline" />View portfolio
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}
          </aside>
        </div>
      )}
    </DashboardShell>
  );
}
