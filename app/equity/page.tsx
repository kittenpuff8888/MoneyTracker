import { redirect } from "next/navigation";
import { InvestmentManager } from "@/components/investments/InvestmentManager";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { createClient } from "@/lib/supabase/server";

export default async function InvestmentPortfolioPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const [profileResult, accountsResult, tradesResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("accounts").select("*").eq("user_id", user.id).eq("type", "Investment").order("created_at", { ascending: false }),
    supabase.from("realized_trades").select("*").eq("user_id", user.id).order("trade_date", { ascending: false })
  ]);

  return (
    <DashboardShell profile={profileResult.data}>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Investment Portfolio</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Driven by your Investment wallets. Log realized trades to update performance and wallet balances.
        </p>
      </div>
      <InvestmentManager wallets={accountsResult.data ?? []} trades={tradesResult.data ?? []} />
    </DashboardShell>
  );
}
