import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { TransactionsManager } from "@/components/transactions/TransactionsManager";
import { createClient } from "@/lib/supabase/server";

export default async function TransactionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const [profileResult, accountsResult, transactionsResult, categoriesResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("accounts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("transaction_categories").select("name").eq("user_id", user.id).order("sort_order", { ascending: true }).order("name", { ascending: true })
  ]);
  const categories = (categoriesResult.data ?? []).map((row) => row.name);

  return (
    <DashboardShell profile={profileResult.data}>
      <TransactionsManager accounts={accountsResult.data ?? []} transactions={transactionsResult.data ?? []} categories={categories} />
    </DashboardShell>
  );
}
