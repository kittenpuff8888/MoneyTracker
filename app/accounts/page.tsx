import { redirect } from "next/navigation";
import { AccountsManager } from "@/components/accounts/AccountsManager";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { createClient } from "@/lib/supabase/server";

export default async function AccountsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const [profileResult, accountsResult, transactionsResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("accounts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", "transfer")
      .order("transaction_date", { ascending: false })
      .limit(5)
  ]);

  return (
    <DashboardShell profile={profileResult.data}>
      <div className="mb-6"><h1 className="text-3xl font-bold">Accounts</h1><p className="mt-1 text-sm text-muted-foreground">Manage wallets, banks, e-wallets, cash, savings, and investment cash.</p></div>
      <AccountsManager accounts={accountsResult.data ?? []} transactions={transactionsResult.data ?? []} />
    </DashboardShell>
  );
}
