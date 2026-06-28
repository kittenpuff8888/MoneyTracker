import { redirect } from "next/navigation";
import { BudgetManager } from "@/components/budget/BudgetManager";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { AsyncInsightText } from "@/components/ai/AsyncInsightText";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { generateBudgetInsightFromData } from "@/lib/ai";
import { createClient } from "@/lib/supabase/server";

export default async function BudgetPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const currentYearStart = `${new Date().getFullYear()}-01-01`;
  const [profileResult, accountsResult, budgetsResult, transactionsResult, subscriptionsResult, equityResult, categoriesResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("accounts").select("*").eq("user_id", user.id),
    supabase.from("budgets").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("transactions").select("*").eq("user_id", user.id).gte("transaction_date", currentYearStart).order("transaction_date", { ascending: false }),
    supabase.from("subscriptions").select("*").eq("user_id", user.id).order("billing_date", { ascending: true }),
    supabase.from("equity_assets").select("*").eq("user_id", user.id),
    supabase.from("transaction_categories").select("name").eq("user_id", user.id).order("name", { ascending: true })
  ]);
  const categories = (categoriesResult.data ?? []).map((row) => row.name);
  const transactions = transactionsResult.data ?? [];
  const insight = await generateBudgetInsightFromData({
    accounts: accountsResult.data ?? [],
    transactions,
    budgets: budgetsResult.data ?? [],
    subscriptions: subscriptionsResult.data ?? [],
    equityAssets: equityResult.data ?? []
  }, "monthly");

  return (
    <DashboardShell profile={profileResult.data}>
      <div className="mb-6"><h1 className="text-3xl font-bold">Budget</h1><p className="mt-1 text-sm text-muted-foreground">Create monthly category limits and receive warnings at 75%, 90%, and 100%.</p></div>
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <BudgetManager budgets={budgetsResult.data ?? []} transactions={transactions} categories={categories} />
        <Card><CardHeader><CardTitle>AI Recommended Budget</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><AsyncInsightText initialInsight={insight.conclusion} period="monthly" /><p>Needs: {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(insight.recommendedBudget.needs)}</p><p>Wants: {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(insight.recommendedBudget.wants)}</p><p>Savings/Investing: {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(insight.recommendedBudget.savingsInvesting)}</p></CardContent></Card>
      </div>
    </DashboardShell>
  );
}
