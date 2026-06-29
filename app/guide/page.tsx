import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { createClient } from "@/lib/supabase/server";

const PANEL = { background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--r)", boxShadow: "var(--sh)" } as const;

const sections = [
  {
    n: "1",
    title: "Add your wallets first",
    body: "Go to Wallet → Add Wallet and create one entry for every place your money lives — bank accounts, e-wallets (GoPay, OVO), cash, plus Savings and Investment wallets. The type matters: Savings wallets power your Goals and Investment wallets power your Portfolio. The balance you enter becomes the baseline; every transaction adjusts it automatically."
  },
  {
    n: "2",
    title: "Record transactions",
    body: "Use the Add Transaction button in the sidebar (or the + on mobile). Pick Expense, Income, or Move Money, choose the wallet, category and payment method, then save. Move Money transfers between two of your own wallets without counting as income or expense."
  },
  {
    n: "3",
    title: "Set your pay day",
    body: "In Settings → Salary / pay day, enter the day your salary lands (e.g. 25). The dashboard's default range and the “This month” preset then run from your most recent pay day to today — so your figures match your real pay cycle, not the calendar month."
  },
  {
    n: "4",
    title: "Read your Dashboard",
    body: "Net Balance is cumulative across all wallets and never changes with the date range. Income, Expense, Savings Ratio and the charts follow the range you pick in the top bar. You also get AI Insights, an Income-vs-Expense chart, an Expense Breakdown (click “View details” for a full expenses page), and Goals + Investments summaries."
  },
  {
    n: "5",
    title: "Set budgets",
    body: "On Budgets, add a monthly limit per category. Cards move from On-track → Tight → Over as you spend, and the dashboard flags any budget above 75% inside AI Insights."
  },
  {
    n: "6",
    title: "Track goals",
    body: "On Goals, first create a Savings wallet, then add a goal linked to it. The goal's progress automatically tracks that wallet's live balance against your target — top up the wallet and the goal fills up. Each card shows progress, remaining, start and target dates."
  },
  {
    n: "7",
    title: "Track investments",
    body: "On Investment Portfolio, create an Investment wallet, then add a position. Add it as Open with just a ticker and entry price; when you close it, set it to Realized and enter the exit price and fee — P&L and return % are calculated for you and the wallet balance updates. The banner shows total realized P&L, cumulative return and win rate."
  },
  {
    n: "8",
    title: "Manage categories",
    body: "Settings → Categories lets you add, rename, or remove the categories used in every dropdown. New users start with a curated default list; changes apply immediately across Transactions, Budgets and Goals."
  },
  {
    n: "9",
    title: "Automated reports",
    body: "In Settings → Report Schedule, enable an emailed summary (daily, weekly, or monthly). The report includes your income/expense totals plus AI-generated insights about your money flow, sent to your account email."
  },
  {
    n: "10",
    title: "Privacy & display",
    body: "The eye icon in the top bar masks every balance with dots (handy in public). The theme toggle switches light/dark, and the calendar sets the date range that drives every figure on the page."
  }
];

export default async function GuidePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  return (
    <DashboardShell profile={profile}>
      <section className="mx-auto max-w-[820px]">
        <div className="mb-5">
          <h1 className="text-[24px] font-bold tracking-[-.01em]">Guide</h1>
          <p className="mt-1.5 text-[13.5px]" style={{ color: "var(--muted)" }}>
            A quick walkthrough of how to get the most out of 8888 Tracker.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {sections.map((s) => (
            <div key={s.n} className="flex gap-3.5 p-4" style={PANEL}>
              <div className="flex h-8 w-8 flex-[0_0_32px] items-center justify-center rounded-[10px] text-[14px] font-bold" style={{ background: "var(--ink)", color: "var(--panel)" }}>{s.n}</div>
              <div>
                <h2 className="text-[14.5px] font-bold">{s.title}</h2>
                <p className="mt-1 text-[13px] leading-[1.6]" style={{ color: "var(--muted)" }}>{s.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-4 text-[12.5px] leading-[1.6]" style={{ ...PANEL, color: "var(--muted)" }}>
          Still stuck? Everything you enter stays private to your account. You can safely experiment — add a test wallet and a few transactions to see how the dashboard responds, then delete them when you are done.
        </div>
      </section>
    </DashboardShell>
  );
}
