import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { SubscriptionManager } from "@/components/subscriptions/SubscriptionManager";
import { calculateMonthlyIncome } from "@/lib/calculations";
import { detectSubscriptionWaste } from "@/lib/financial-intelligence";
import { createClient } from "@/lib/supabase/server";

export default async function SubscriptionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const monthStart = new Date();
  monthStart.setDate(1);
  const [profileResult, accountsResult, subscriptionsResult, transactionsResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("accounts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("subscriptions").select("*").eq("user_id", user.id).order("billing_date", { ascending: true }),
    supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", "income")
      .gte("transaction_date", monthStart.toISOString().slice(0, 10))
  ]);
  const subscriptions = subscriptionsResult.data ?? [];
  const income = calculateMonthlyIncome(transactionsResult.data ?? []);
  const subscriptionAnalysis = detectSubscriptionWaste({ subscriptions, income });

  return (
    <DashboardShell profile={profileResult.data}>
      <div className="mb-6"><h1 className="text-3xl font-bold">Subscriptions</h1><p className="mt-1 text-sm text-muted-foreground">Track recurring payments and renewal warnings.</p></div>
      <SubscriptionManager
        subscriptions={subscriptions}
        accounts={accountsResult.data ?? []}
        analysis={subscriptionAnalysis}
      />
    </DashboardShell>
  );
}
