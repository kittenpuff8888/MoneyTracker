import { redirect } from "next/navigation";
import { BudgetManager } from "@/components/budget/BudgetManager";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { generateBudgetInsight } from "@/lib/ai";
import { createClient } from "@/lib/supabase/server";

export default async function BudgetPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const [profileResult, budgetsResult, transactionsResult, insight] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("budgets").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("transactions").select("*").eq("user_id", user.id).order("transaction_date", { ascending: false }),
    generateBudgetInsight(user.id, "monthly")
  ]);

  return (
    <DashboardShell profile={profileResult.data}>
      <div className="mb-6"><h1 className="text-3xl font-bold">Budget</h1><p className="mt-1 text-sm text-muted-foreground">Create monthly category limits and receive warnings at 75%, 90%, and 100%.</p></div>
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <BudgetManager budgets={budgetsResult.data ?? []} transactions={transactionsResult.data ?? []} />
        <Card><CardHeader><CardTitle>AI Recommended Budget</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><p>{insight.conclusion}</p><p>Needs: {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(insight.recommendedBudget.needs)}</p><p>Wants: {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(insight.recommendedBudget.wants)}</p><p>Savings/Investing: {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(insight.recommendedBudget.savingsInvesting)}</p></CardContent></Card>
      </div>
    </DashboardShell>
  );
}
