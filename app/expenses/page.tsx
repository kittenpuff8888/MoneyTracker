import { differenceInCalendarDays, eachDayOfInterval, format, isSameDay, parseISO } from "date-fns";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SpendingBreakdownChart } from "@/components/charts/SpendingBreakdownChart";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatIDR } from "@/lib/formatters";
import { categoryColor } from "@/lib/category-colors";
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

  // by merchant
  const merMap = new Map<string, number>();
  for (const t of expenses) {
    const key = t.name || t.category;
    merMap.set(key, (merMap.get(key) ?? 0) + toNumber(t.amount));
  }
  const topMerchants = Array.from(merMap.entries()).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount).slice(0, 6);

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

            {/* Donut + daily trend */}
            <div className="mb-3.5 grid grid-cols-1 gap-3.5 lg:grid-cols-2">
              <div className="p-4" style={PANEL}>
                <div className="mb-3.5 text-[11px] font-semibold tracking-[.07em]" style={{ color: "var(--faint)" }}>BY CATEGORY</div>
                <SpendingBreakdownChart data={donutData} />
              </div>
              <div className="p-4" style={PANEL}>
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
            </div>

            {/* Category table */}
            <div className="mb-3.5 overflow-hidden" style={PANEL}>
              <div className="px-[18px] py-3.5 text-[11px] font-semibold tracking-[.07em]" style={{ color: "var(--faint)", borderBottom: "1px solid var(--hair)" }}>ALL CATEGORIES</div>
              <div className="flex flex-col">
                {byCategory.map((c) => {
                  const color = categoryColor(c.category);
                  return (
                    <div key={c.category} className="flex items-center gap-3 px-[18px] py-3" style={{ borderBottom: "1px solid var(--hair)" }}>
                      <span className="h-2.5 w-2.5 flex-[0_0_10px] rounded-[3px]" style={{ background: color }} />
                      <span className="w-40 shrink-0 truncate text-[13px] font-semibold">{c.category}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: "var(--soft)" }}>
                        <div className="h-full rounded-full" style={{ width: `${c.percent}%`, background: color }} />
                      </div>
                      <span className="num w-10 text-right text-[11.5px]" style={{ color: "var(--muted)" }}>{c.percent.toFixed(0)}%</span>
                      <span className="num w-14 shrink-0 text-right text-[11px]" style={{ color: "var(--faint)" }}>{c.count}×</span>
                      <span className="num w-28 shrink-0 text-right text-[13px] font-semibold">{formatIDR(c.amount)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top merchants */}
            <div className="overflow-hidden" style={PANEL}>
              <div className="px-[18px] py-3.5 text-[11px] font-semibold tracking-[.07em]" style={{ color: "var(--faint)", borderBottom: "1px solid var(--hair)" }}>TOP MERCHANTS</div>
              {topMerchants.map((m) => (
                <div key={m.name} className="flex items-center justify-between px-[18px] py-3 text-[13px]" style={{ borderBottom: "1px solid var(--hair)" }}>
                  <span className="font-semibold">{m.name}</span>
                  <span className="num font-semibold">{formatIDR(m.amount)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </DashboardShell>
  );
}
