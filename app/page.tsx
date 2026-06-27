import Link from "next/link";
import { PiggyBank, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { LoginButton } from "@/components/auth/LoginButton";
import { FinancePreview } from "@/components/landing/FinancePreview";
import { createClient } from "@/lib/supabase/server";

type HomePageProps = {
  searchParams: Promise<{ auth_error?: string }>;
};

const authErrors: Record<string, string> = {
  missing_code: "The login link is incomplete. Please try signing in again.",
  exchange_failed: "That login attempt expired or came from another website address. Please try again.",
  user_missing: "Login completed, but no user account was returned. Please try again."
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const { auth_error: authError } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <main className="min-h-svh overflow-hidden bg-white text-foreground">
      <section className="sky-grid relative min-h-svh">
        <header className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Money Tracker home">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-sky-500 text-white">
              <PiggyBank size={18} />
            </span>
            <span className="font-bold">Money Tracker</span>
          </Link>
          <span className="hidden items-center gap-2 text-xs font-medium text-muted-foreground sm:flex">
            <ShieldCheck size={15} className="text-emerald-500" />
            Private by design
          </span>
        </header>

        <div className="mx-auto grid min-h-[calc(100svh-4rem)] max-w-7xl items-center gap-4 px-5 py-6 sm:gap-8 sm:px-6 lg:grid-cols-[0.86fr_1.14fr] lg:gap-14 lg:py-8">
          <div className="max-w-xl">
            <p className="mb-4 text-sm font-semibold text-sky-700">Personal finance in Indonesian Rupiah</p>
            <h1 className="text-5xl font-bold leading-[1.03] tracking-normal sm:text-6xl lg:text-7xl">
              Money Tracker
            </h1>
            <p className="mt-4 max-w-lg text-xl font-semibold leading-8 text-slate-700 sm:text-2xl">
              See where your money goes and what to do next.
            </p>
            <p className="mt-4 max-w-lg text-base leading-7 text-muted-foreground">
              Accounts, daily spending, budgets, subscriptions, savings, and investments in one calm IDR dashboard.
            </p>
            {authError ? (
              <p className="mt-5 max-w-xl rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {authErrors[authError] ?? "Login could not be completed. Please try again."}
              </p>
            ) : null}
            <div className="mt-7">
              <LoginButton />
            </div>
            <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck size={14} className="text-emerald-500" />
              Your financial data stays protected by account-level access controls.
            </p>
          </div>

          <FinancePreview />
        </div>
      </section>
    </main>
  );
}
