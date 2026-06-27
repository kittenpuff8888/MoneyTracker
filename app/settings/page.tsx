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
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
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
      </div>
    </DashboardShell>
  );
}
