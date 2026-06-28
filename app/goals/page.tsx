import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { GoalsManager } from "@/components/goals/GoalsManager";
import { createClient } from "@/lib/supabase/server";

export default async function GoalsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [profileResult, accountsResult, goalsResult, categoriesResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("accounts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("goals").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("transaction_categories").select("name").eq("user_id", user.id).order("sort_order").order("name")
  ]);

  const categories = (categoriesResult.data ?? []).map((r) => r.name);

  return (
    <DashboardShell profile={profileResult.data}>
      <GoalsManager accounts={accountsResult.data ?? []} goals={goalsResult.data ?? []} categories={categories} />
    </DashboardShell>
  );
}
