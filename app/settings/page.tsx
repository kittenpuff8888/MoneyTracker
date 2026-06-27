import Image from "next/image";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const [profileResult, auditResult, emailLogResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("financial_audit_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("email_report_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5)
  ]);
  const profile = profileResult.data;
  if (!profile) redirect("/auth/callback");

  return (
    <DashboardShell profile={profile}>
      <div className="mb-6"><h1 className="text-3xl font-bold">Settings</h1><p className="mt-1 text-sm text-muted-foreground">Manage Gmail profile info, weekly reports, and locked IDR currency.</p></div>
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardContent className="text-center">
            {profile.avatar_url ? <Image src={profile.avatar_url} alt={profile.full_name ?? "Avatar"} width={96} height={96} className="mx-auto rounded-full" /> : <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-sky-100 text-3xl font-bold text-sky-700">{(profile.full_name ?? profile.email ?? "U").slice(0, 1)}</div>}
            <h2 className="mt-4 text-xl font-bold">{profile.full_name}</h2>
            <p className="break-all text-sm text-muted-foreground">{profile.email}</p>
            <div className="mt-6"><LogoutButton /></div>
          </CardContent>
        </Card>
        <Card><CardHeader><CardTitle>Preferences</CardTitle></CardHeader><CardContent><SettingsForm profile={profile} /></CardContent></Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Recent Account Activity</CardTitle></CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-2">
            <section>
              <h3 className="text-sm font-semibold">Financial changes</h3>
              <div className="mt-3 divide-y divide-border">
                {(auditResult.data ?? []).length ? (auditResult.data ?? []).map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                    <span><strong>{entry.action}</strong> {entry.entity_type.replaceAll("_", " ")}</span>
                    <time className="shrink-0 text-xs text-muted-foreground">{new Date(entry.created_at).toLocaleDateString("id-ID")}</time>
                  </div>
                )) : (
                  <p className="py-3 text-sm text-muted-foreground">
                    No audit records yet. Records appear after the security migration is active.
                  </p>
                )}
              </div>
            </section>
            <section>
              <h3 className="text-sm font-semibold">Weekly report delivery</h3>
              <div className="mt-3 divide-y divide-border">
                {(emailLogResult.data ?? []).length ? (emailLogResult.data ?? []).map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                    <span className="capitalize">{entry.status}</span>
                    <time className="shrink-0 text-xs text-muted-foreground">{new Date(entry.created_at).toLocaleDateString("id-ID")}</time>
                  </div>
                )) : (
                  <p className="py-3 text-sm text-muted-foreground">No weekly report deliveries yet.</p>
                )}
              </div>
            </section>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
