import { redirect } from "next/navigation";
import { BudgetManager } from "@/components/budget/BudgetManager";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { createClient } from "@/lib/supabase/server";

export default async function BudgetPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const currentYearStart = `${new Date().getFullYear()}-01-01`;
  const [profileResult, budgetsResult, transactionsResult, categoriesResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("budgets").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("transactions").select("*").eq("user_id", user.id).gte("transaction_date", currentYearStart).order("transaction_date", { ascending: false }),
    supabase.from("transaction_categories").select("name").eq("user_id", user.id).order("sort_order", { ascending: true }).order("name", { ascending: true })
  ]);
  const categories = (categoriesResult.data ?? []).map((row) => row.name);

  return (
    <DashboardShell profile={profileResult.data}>
      <BudgetManager budgets={budgetsResult.data ?? []} transactions={transactionsResult.data ?? []} categories={categories} />
    </DashboardShell>
  );
}
