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
      .order("transaction_date", { ascending: false })
  ]);

  return (
    <DashboardShell profile={profileResult.data}>
      <div className="mb-6"><h1 className="text-3xl font-bold">Wallet</h1><p className="mt-1 text-sm text-muted-foreground">Manage your wallets by type \u2014 bank, cash, e-wallet, e-money, savings, and investment.</p></div>
      <AccountsManager accounts={accountsResult.data ?? []} transactions={transactionsResult.data ?? []} />
    </DashboardShell>
  );
}
