import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { CategoryManager } from "@/components/categories/CategoryManager";
import { createClient } from "@/lib/supabase/server";

const PANEL = { background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--r)", boxShadow: "var(--sh)" } as const;

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
      <section className="mx-auto max-w-[920px]">
        <div className="mb-5">
          <h1 className="text-[24px] font-bold tracking-[-.01em]">Settings</h1>
          <p className="mt-1.5 text-[13.5px]" style={{ color: "var(--muted)" }}>
            Control how your reports are generated and manage the categories used across the app.
          </p>
        </div>

        {/* Profile */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4 p-5" style={PANEL}>
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-full text-[18px] font-bold" style={{ background: "var(--ink)", color: "var(--panel)" }}>
              {(profile.full_name ?? profile.email ?? "U").slice(0, 1).toUpperCase()}
            </div>
            <div>
              <div className="text-[15px] font-bold">{profile.full_name ?? "8888 User"}</div>
              <div className="break-all text-[12.5px]" style={{ color: "var(--muted)" }}>{profile.email}</div>
            </div>
          </div>
          <div className="w-full sm:w-auto"><LogoutButton /></div>
        </div>

        {/* Report schedule */}
        <div className="mb-4 p-5" style={PANEL}>
          <div className="mb-1 text-[11px] font-semibold tracking-[.07em]" style={{ color: "var(--faint)" }}>REPORT SCHEDULE</div>
          <div className="mb-4 text-[13px]" style={{ color: "var(--muted)" }}>Choose when 8888 Tracker compiles and sends your summary.</div>
          <SettingsForm profile={profile} />
        </div>

        {/* Category manager */}
        <div className="mb-4 p-5" style={PANEL}>
          <div className="mb-1 text-[11px] font-semibold tracking-[.07em]" style={{ color: "var(--faint)" }}>CATEGORIES</div>
          <div className="mb-4 text-[13px]" style={{ color: "var(--muted)" }}>Used in transaction type &amp; category dropdowns. Add, rename, or remove.</div>
          <CategoryManager categories={categoriesResult.data ?? []} />
        </div>

        {/* Activity logs */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="overflow-hidden" style={PANEL}>
            <div className="px-5 py-3.5 text-[11px] font-semibold tracking-[.07em]" style={{ color: "var(--faint)", borderBottom: "1px solid var(--hair)" }}>FINANCIAL ACTIVITY LOG</div>
            {(auditResult.data ?? []).length ? (
              (auditResult.data ?? []).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-4 px-5 py-3 text-[13px]" style={{ borderBottom: "1px solid var(--hair)" }}>
                  <span><strong>{entry.action}</strong> {entry.entity_type.replaceAll("_", " ")}</span>
                  <time className="num shrink-0 text-[11px]" style={{ color: "var(--muted)" }}>{new Date(entry.created_at).toLocaleDateString("id-ID")}</time>
                </div>
              ))
            ) : (
              <p className="px-5 py-4 text-[13px]" style={{ color: "var(--muted)" }}>No audit records yet.</p>
            )}
          </div>

          <div className="overflow-hidden" style={PANEL}>
            <div className="px-5 py-3.5 text-[11px] font-semibold tracking-[.07em]" style={{ color: "var(--faint)", borderBottom: "1px solid var(--hair)" }}>REPORT DELIVERY LOG</div>
            {(emailLogResult.data ?? []).length ? (
              (emailLogResult.data ?? []).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-4 px-5 py-3 text-[13px]" style={{ borderBottom: "1px solid var(--hair)" }}>
                  <span className="capitalize">{entry.status}</span>
                  <time className="num shrink-0 text-[11px]" style={{ color: "var(--muted)" }}>{new Date(entry.created_at).toLocaleDateString("id-ID")}</time>
                </div>
              ))
            ) : (
              <p className="px-5 py-4 text-[13px]" style={{ color: "var(--muted)" }}>No report deliveries yet.</p>
            )}
          </div>
        </div>
      </section>
    </DashboardShell>
  );
}
