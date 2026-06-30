import { differenceInCalendarDays, eachDayOfInterval, format, isSameDay, parseISO } from "date-fns";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ExpenseBreakdown } from "@/components/expenses/ExpenseBreakdown";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatIDR } from "@/lib/formatters";
import { payPeriodRange, ymd } from "@/lib/pay-period";
import { toNumber } from "@/lib/calculations";
import { createClient } from "@/lib/supabase/server";

function isValidDate(v: string | undefined): v is string {
  return Boolean(v) && /^\d{4}-\d{2}-\d{2}$/.test(v as string);
}

const PANEL = { background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--r)", boxShadow: "var(--sh)" } as const;

export default async function ExpensesPage({
  searchParams
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const sp = await searchParams;
  const now = new Date();
  const { data: payProfile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const cycle = payPeriodRange(payProfile?.pay_day, now);
  const from = isValidDate(sp.from) ? sp.from : ymd(cycle.from);
  const to = isValidDate(sp.to) ? sp.to : ymd(cycle.to);
  const fromDate = parseISO(from);
  const toDate = parseISO(to);
  const rangeLabel = `${format(fromDate, "d MMM")} – ${format(toDate, "d MMM yyyy")}`;

  const { data: txData } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .eq("type", "outcome")
    .gte("transaction_date", from)
    .lte("transaction_date", to)
    .order("transaction_date", { ascending: false });
  const expenses = txData ?? [];

  const total = expenses.reduce((a, t) => a + toNumber(t.amount), 0);
  const count = expenses.length;
  const days = Math.max(differenceInCalendarDays(toDate, fromDate) + 1, 1);
  const avgPerDay = total / days;

  // by category
  const catMap = new Map<string, { amount: number; count: number }>();
  for (const t of expenses) {
    const cur = catMap.get(t.category) ?? { amount: 0, count: 0 };
    cur.amount += toNumber(t.amount); cur.count += 1;
    catMap.set(t.category, cur);
  }
  const byCategory = Array.from(catMap.entries())
    .map(([category, v]) => ({ category, amount: v.amount, count: v.count, percent: total > 0 ? (v.amount / total) * 100 : 0 }))
    .sort((a, b) => b.amount - a.amount);
  const donutData = byCategory.map((c) => ({ category: c.category, amount: c.amount, percent: c.percent }));
  const topCategory = byCategory[0];

  // individual expense rows for the Top Expenses table (filterable by category)
  const expenseRows = expenses.map((t) => ({
    id: t.id,
    name: t.name || t.category,
    category: t.category,
    amount: toNumber(t.amount)
  }));

  // daily series
  const daily = eachDayOfInterval({ start: fromDate, end: toDate }).map((d) => ({
    date: d,
    amount: expenses.filter((t) => isSameDay(parseISO(t.transaction_date), d)).reduce((a, t) => a + toNumber(t.amount), 0)
  }));
  const dailyMax = Math.max(1, ...daily.map((d) => d.amount));

  return (
    <DashboardShell profile={payProfile}>
      <section className="mx-auto max-w-[1100px]">
        <div className="mb-4">
          <Link href={`/dashboard?from=${from}&to=${to}`} className="text-[12px] font-semibold" style={{ color: "var(--accent)" }}>‹ Back to dashboard</Link>
          <h1 className="mt-1.5 text-[24px] font-bold tracking-[-.01em]">Expense Breakdown</h1>
          <p className="mt-1 text-[13.5px]" style={{ color: "var(--muted)" }}>Detailed view of your spending for <span className="font-semibold" style={{ color: "var(--text)" }}>{rangeLabel}</span>.</p>
        </div>

        {count === 0 ? (
          <EmptyState title="No expenses in this range." description="Adjust the date range on the dashboard, or record some spending." />
        ) : (
          <>
            {/* Summary tiles */}
            <div className="mb-3.5 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
              {[
                { label: "TOTAL SPENT", value: formatIDR(total) },
                { label: "TRANSACTIONS", value: String(count) },
                { label: "AVG / DAY", value: formatIDR(Math.round(avgPerDay)) },
                { label: "TOP CATEGORY", value: topCategory ? topCategory.category : "—" }
              ].map((tile) => (
                <div key={tile.label} className="p-4" style={PANEL}>
                  <div className="mb-1.5 text-[11px] font-semibold tracking-[.05em]" style={{ color: "var(--faint)" }}>{tile.label}</div>
                  <div className="num text-[19px] font-semibold">{tile.value}</div>
                </div>
              ))}
            </div>

            {/* Daily trend */}
            <div className="mb-3.5 p-4" style={PANEL}>
              <div className="mb-3.5 text-[11px] font-semibold tracking-[.07em]" style={{ color: "var(--faint)" }}>SPENDING PER DAY</div>
              <div className="flex h-40 items-end gap-[3px]">
                {daily.map((d, i) => (
                  <div key={i} className="group relative flex-1" title={`${format(d.date, "d MMM")}: ${formatIDR(d.amount)}`}>
                    <div className="w-full rounded-t-[3px]" style={{ height: `${Math.max((d.amount / dailyMax) * 150, d.amount > 0 ? 3 : 0)}px`, background: "var(--accent)", opacity: d.amount > 0 ? 0.85 : 0.15 }} />
                  </div>
                ))}
              </div>
              <div className="mt-1.5 flex justify-between text-[10px]" style={{ color: "var(--faint)" }}>
                <span className="num">{format(fromDate, "d MMM")}</span>
                <span className="num">{format(toDate, "d MMM")}</span>
              </div>
            </div>

            {/* Interactive: category donut + clickable category list + Top Expenses */}
            <ExpenseBreakdown expenses={expenseRows} byCategory={byCategory} donutData={donutData} />
          </>
        )}
      </section>
    </DashboardShell>
  );
}
