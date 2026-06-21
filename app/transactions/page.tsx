import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { TransactionsManager } from "@/components/transactions/TransactionsManager";
import { createClient } from "@/lib/supabase/server";

export default async function TransactionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const [profileResult, accountsResult, transactionsResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("accounts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("transactions").select("*").eq("user_id", user.id).order("transaction_date", { ascending: false })
  ]);

  return (
    <DashboardShell profile={profileResult.data}>
      <div className="mb-6"><h1 className="text-3xl font-bold">Transactions</h1><p className="mt-1 text-sm text-muted-foreground">Add, edit, delete, and view income, outcome, and Transfer / Move Money records.</p></div>
      <TransactionsManager accounts={accountsResult.data ?? []} transactions={transactionsResult.data ?? []} />
    </DashboardShell>
  );
}
