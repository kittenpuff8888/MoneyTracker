import { endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "date-fns";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { WeeklyReportPreview } from "@/components/reports/WeeklyReportPreview";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { calculateSavingsRatio, calculateSpendingByCategory } from "@/lib/calculations";
import { formatIDR, formatPercent } from "@/lib/formatters";
import { generateBudgetInsight } from "@/lib/ai";
import { createClient } from "@/lib/supabase/server";

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const [profileResult, transactionsResult, budgetsResult, insight] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("transactions").select("*").eq("user_id", user.id).order("transaction_date", { ascending: false }),
    supabase.from("budgets").select("*").eq("user_id", user.id),
    generateBudgetInsight(user.id, "weekly")
  ]);
  const transactions = transactionsResult.data ?? [];
  const now = new Date();
  const inRange = (start: Date, end: Date) => transactions.filter((item) => new Date(item.transaction_date) >= start && new Date(item.transaction_date) <= end);
  const weekly = inRange(startOfWeek(now, { weekStartsOn: 1 }), endOfWeek(now, { weekStartsOn: 1 }));
  const monthly = inRange(startOfMonth(now), endOfMonth(now));
  const weeklyIncome = weekly.filter((item) => item.type === "income").reduce((sum, item) => sum + Number(item.amount), 0);
  const weeklyOutcome = weekly.filter((item) => item.type === "outcome").reduce((sum, item) => sum + Number(item.amount), 0);
  const monthlyIncome = monthly.filter((item) => item.type === "income").reduce((sum, item) => sum + Number(item.amount), 0);
  const monthlyOutcome = monthly.filter((item) => item.type === "outcome").reduce((sum, item) => sum + Number(item.amount), 0);

  return (
    <DashboardShell profile={profileResult.data}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-3xl font-bold">Reports</h1><p className="mt-1 text-sm text-muted-foreground">Weekly and monthly summaries with AI budget conclusions and email preview.</p></div><a href="/api/reports/monthly-pdf"><Button>Download Monthly PDF</Button></a></div>
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="grid gap-4 md:grid-cols-2">
          <Card><CardHeader><CardTitle>Weekly Summary</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p>Income: <strong>{formatIDR(weeklyIncome)}</strong></p><p>Outcome: <strong>{formatIDR(weeklyOutcome)}</strong></p><p>Net Saved: <strong>{formatIDR(weeklyIncome - weeklyOutcome)}</strong></p><p>Savings Rate: <strong>{formatPercent(calculateSavingsRatio(weeklyIncome, weeklyOutcome))}</strong></p></CardContent></Card>
          <Card><CardHeader><CardTitle>Monthly Summary</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p>Income: <strong>{formatIDR(monthlyIncome)}</strong></p><p>Outcome: <strong>{formatIDR(monthlyOutcome)}</strong></p><p>Net Saved: <strong>{formatIDR(monthlyIncome - monthlyOutcome)}</strong></p><p>Savings Rate: <strong>{formatPercent(calculateSavingsRatio(monthlyIncome, monthlyOutcome))}</strong></p></CardContent></Card>
          <Card className="md:col-span-2"><CardHeader><CardTitle>Budget Warnings</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">{(budgetsResult.data ?? []).length ? "Budget warnings are calculated on the Budget page from current spending per category." : "No budgets yet. Create budgets to unlock category warnings."}</p></CardContent></Card>
          <Card className="md:col-span-2"><CardHeader><CardTitle>Overspending Warnings</CardTitle></CardHeader><CardContent className="space-y-2">{insight.overspendingWarnings.length ? insight.overspendingWarnings.map((item) => <p key={item.category} className="text-sm">{item.category} increased by <strong>{formatPercent(item.increase)}</strong> this week.</p>) : <p className="text-sm text-muted-foreground">No overspending spikes detected this week.</p>}</CardContent></Card>
          <Card className="md:col-span-2"><CardHeader><CardTitle>AI Budget Conclusion</CardTitle></CardHeader><CardContent><p className="text-sm leading-6">{insight.conclusion}</p></CardContent></Card>
        </div>
        <WeeklyReportPreview income={weeklyIncome} outcome={weeklyOutcome} netSaved={weeklyIncome - weeklyOutcome} savingsRate={calculateSavingsRatio(weeklyIncome, weeklyOutcome)} topCategories={calculateSpendingByCategory(weekly)} insight={insight.conclusion} />
      </div>
    </DashboardShell>
  );
}
