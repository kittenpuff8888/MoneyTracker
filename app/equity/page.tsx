import { redirect } from "next/navigation";
import { EquityManager } from "@/components/equity/EquityManager";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { createClient } from "@/lib/supabase/server";

export default async function EquityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const [profileResult, assetsResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("equity_assets").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
  ]);

  return (
    <DashboardShell profile={profileResult.data}>
      <div className="mb-6"><h1 className="text-3xl font-bold">Equity Tracker</h1><p className="mt-1 text-sm text-muted-foreground">Customize investment and asset tracking for your own account.</p></div>
      <EquityManager assets={assetsResult.data ?? []} />
    </DashboardShell>
  );
}
