import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { LoginButton } from "@/components/auth/LoginButton";
import { createClient } from "@/lib/supabase/server";

type HomePageProps = {
  searchParams: Promise<{ auth_error?: string }>;
};

const authErrors: Record<string, string> = {
  missing_code: "The login link is incomplete. Please try signing in again.",
  exchange_failed: "That login attempt expired or came from another website address. Please try again.",
  user_missing: "Login completed, but no user account was returned. Please try again.",
  profile_sync_failed: "Login succeeded, but the security migration is not active yet. Please contact support."
};

const PANEL = { background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--r)", boxShadow: "var(--sh)" } as const;

export default async function HomePage({ searchParams }: HomePageProps) {
  const { auth_error: authError } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <main className="min-h-svh p-0 md:p-3.5" style={{ background: "var(--frame)", color: "var(--text)" }}>
      <div className="mx-auto min-h-svh max-w-[1560px] md:min-h-[calc(100svh-1.75rem)]" style={{ ...PANEL, borderRadius: "var(--shellR)" }}>
        {/* Top bar */}
        <header className="flex items-center justify-between px-5 py-[18px] sm:px-8" style={{ borderBottom: "1px solid var(--hair)" }}>
          <Link href="/" className="flex items-center gap-[11px]" aria-label="8888 Tracker home">
            <span className="grid h-9 w-9 place-items-center rounded-[11px]" style={{ background: "var(--ink)" }}>
              <span className="num text-[13px] font-bold" style={{ color: "var(--panel)" }}>88</span>
            </span>
            <span className="text-[14.5px] font-extrabold tracking-[-.01em]">8888 Tracker</span>
          </Link>
          <span className="hidden items-center gap-2 text-xs font-medium sm:flex" style={{ color: "var(--muted)" }}>
            <ShieldCheck size={15} style={{ color: "var(--up)" }} />
            Private by design
          </span>
        </header>

        {/* Hero */}
        <div className="grid items-center gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14 lg:py-16">
          <div className="max-w-xl">
            <p className="mb-4 text-[13px] font-semibold tracking-[.04em]" style={{ color: "var(--accent)" }}>PERSONAL FINANCE</p>
            <h1 className="text-5xl font-extrabold leading-[1.03] tracking-[-.02em] sm:text-6xl">8888 Tracker</h1>
            <p className="mt-4 max-w-lg text-xl font-semibold leading-8 sm:text-2xl">Where Prosperity will Find you.</p>
            <p className="mt-4 max-w-lg text-[15px] leading-7" style={{ color: "var(--muted)" }}>
              Wallets, daily spending, budgets, investments, and AI insights — all in one calm, fast dashboard built for Rupiah.
            </p>
            {authError ? (
              <p className="mt-5 max-w-xl rounded-[12px] px-4 py-3 text-sm" style={{ background: "var(--downSoft)", border: "1px solid var(--down)", color: "var(--down)" }}>
                {authErrors[authError] ?? "Login could not be completed. Please try again."}
              </p>
            ) : null}
            <div className="mt-7"><LoginButton /></div>
            <p className="mt-4 flex items-center gap-2 text-xs" style={{ color: "var(--muted)" }}>
              <ShieldCheck size={14} style={{ color: "var(--up)" }} />
              Your financial data stays protected by account-level access controls.
            </p>
          </div>

          {/* Mock dashboard preview */}
          <div className="hidden lg:block">
            <div className="p-4" style={{ ...PANEL, borderRadius: "20px" }}>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] font-semibold tracking-[.07em]" style={{ color: "var(--faint)" }}>NET BALANCE</span>
                <span className="rounded-[5px] px-[7px] py-0.5 text-[9.5px] font-bold" style={{ background: "var(--accentSoft)", color: "var(--accent)" }}>CUMULATIVE</span>
              </div>
              <div className="num text-[30px] font-semibold leading-none">Rp 57.235.000</div>
              <div className="mt-1 text-[11.5px]" style={{ color: "var(--muted)" }}>Total across all wallets</div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-[12px] p-3.5" style={{ background: "var(--softer)", border: "1px solid var(--hair)" }}>
                  <div className="mb-1 flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-[7px]" style={{ background: "var(--accentSoft)", color: "var(--accent)" }}>↓</span><span className="text-[10.5px] font-semibold" style={{ color: "var(--faint)" }}>INCOME</span></div>
                  <div className="num text-[18px] font-semibold">Rp 8.700.000</div>
                </div>
                <div className="rounded-[12px] p-3.5" style={{ background: "var(--softer)", border: "1px solid var(--hair)" }}>
                  <div className="mb-1 flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-[7px]" style={{ background: "var(--downSoft)", color: "var(--down)" }}>↑</span><span className="text-[10.5px] font-semibold" style={{ color: "var(--faint)" }}>EXPENSE</span></div>
                  <div className="num text-[18px] font-semibold">Rp 3.420.000</div>
                </div>
              </div>

              {/* mini bars */}
              <div className="mt-4 rounded-[12px] p-3.5" style={{ background: "var(--softer)", border: "1px solid var(--hair)" }}>
                <div className="mb-2 text-[10.5px] font-semibold tracking-[.07em]" style={{ color: "var(--faint)" }}>INCOME vs EXPENSE</div>
                <div className="flex h-24 items-end gap-2">
                  {[
                    [60, 38], [72, 44], [54, 60], [80, 50], [66, 40], [90, 55]
                  ].map(([inc, exp], i) => (
                    <div key={i} className="flex flex-1 items-end gap-1">
                      <div className="flex-1 rounded-t-[3px]" style={{ height: `${inc}%`, background: "var(--up)" }} />
                      <div className="flex-1 rounded-t-[3px]" style={{ height: `${exp}%`, background: "var(--down)", opacity: 0.7 }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
