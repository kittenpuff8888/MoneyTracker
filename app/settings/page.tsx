import Image from "next/image";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { CategoryManager } from "@/components/categories/CategoryManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [profileResult, auditResult, emailLogResult, categoriesResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("financial_audit_logs").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
    supabase.from("email_report_logs").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
    supabase.from("transaction_categories").select("*").eq("user_id", user.id).order("name", { ascending: true })
  ]);

  const profile = profileResult.data;
  if (!profile) redirect("/auth/callback");

  return (
    <DashboardShell profile={profile}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Manage your profile, report schedule, and categories.</p>
      </div>

      <div className="grid gap-5">
        {/* Profile + Preferences row */}
        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
          {/* Profile card */}
          <Card>
            <CardContent className="flex flex-col items-center py-6 text-center">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.full_name ?? "Avatar"}
                  width={80}
                  height={80}
                  className="rounded-full"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-foreground text-2xl font-bold text-card">
                  {(profile.full_name ?? profile.email ?? "U").slice(0, 1).toUpperCase()}
                </div>
              )}
              <h2 className="mt-4 text-lg font-bold">{profile.full_name}</h2>
              <p className="break-all text-sm text-muted-foreground">{profile.email}</p>
              <div className="mt-5 w-full">
                <LogoutButton />
              </div>
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card>
            <CardHeader><CardTitle>Preferences</CardTitle></CardHeader>
            <CardContent>
              <SettingsForm profile={profile} />
            </CardContent>
          </Card>
        </div>

        {/* Category Manager */}
        <Card>
          <CardHeader>
            <CardTitle>Categories</CardTitle>
            <p className="mt-0.5 text-sm text-muted-foreground">
              These categories feed every dropdown in Transactions and Budgets.
            </p>
          </CardHeader>
          <CardContent>
            <CategoryManager categories={categoriesResult.data ?? []} />
          </CardContent>
        </Card>

        {/* Activity logs */}
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Financial Activity Log</CardTitle></CardHeader>
            <CardContent className="divide-y divide-border p-0">
              {(auditResult.data ?? []).length ? (
                (auditResult.data ?? []).map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                    <span><strong>{entry.action}</strong> {entry.entity_type.replaceAll("_", " ")}</span>
                    <time className="num shrink-0 text-xs text-muted-foreground">
                      {new Date(entry.created_at).toLocaleDateString("id-ID")}
                    </time>
                  </div>
                ))
              ) : (
                <p className="px-5 py-4 text-sm text-muted-foreground">No audit records yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Report Delivery Log</CardTitle></CardHeader>
            <CardContent className="divide-y divide-border p-0">
              {(emailLogResult.data ?? []).length ? (
                (emailLogResult.data ?? []).map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                    <span className="capitalize">{entry.status}</span>
                    <time className="num shrink-0 text-xs text-muted-foreground">
                      {new Date(entry.created_at).toLocaleDateString("id-ID")}
                    </time>
                  </div>
                ))
              ) : (
                <p className="px-5 py-4 text-sm text-muted-foreground">No report deliveries yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
