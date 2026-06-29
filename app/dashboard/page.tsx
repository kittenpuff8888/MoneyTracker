import {
  differenceInCalendarDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  format,
  isSameDay,
  isSameMonth,
  parseISO
} from "date-fns";
import { payPeriodRange, ymd } from "@/lib/pay-period";
import { redirect } from "next/navigation";
import Link from "next/link";
import { IncomeOutcomeChart } from "@/components/charts/IncomeOutcomeChart";
import { SpendingBreakdownChart } from "@/components/charts/SpendingBreakdownChart";
import { AsyncInsightText } from "@/components/ai/AsyncInsightText";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { DashboardHeaderActions } from "@/components/dashboard/HeaderActions";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  calculateBurnRate,
  calculateNetBalance,
  calculateRemainingBalance,
  calculateSavingsRatio,
  calculateSpendingByCategory,
  sumTransactionsInRange,
  toNumber
} from "@/lib/calculations";
import { generateBudgetInsightFromData } from "@/lib/ai";
import { formatIDR, formatPercent } from "@/lib/formatters";
import { categoryColor, txTypeMeta } from "@/lib/category-colors";
import { createClient } from "@/lib/supabase/server";
import type { Transaction } from "@/lib/types";

function isValidDate(v: string | undefined): v is string {
  return Boolean(v) && /^\d{4}-\d{2}-\d{2}$/.test(v as string);
}
function pct(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}
function pctLabel(v: number) {
  return `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
}

/* Income vs expense series, bucketed dynamically by the selected range. */
function buildSeries(transactions: Transaction[], fromDate: Date, toDate: Date) {
  const days = differenceInCalendarDays(toDate, fromDate) + 1;
  if (days <= 45) {
    return eachDayOfInterval({ start: fromDate, end: toDate }).map((d) => {
      const inDay = transactions.filter((t) => isValidDate(t.transaction_date) && isSameDay(parseISO(t.transaction_date), d));
      return {
        month: format(d, "d/M"),
        income: inDay.filter((t) => t.type === "income").reduce((a, t) => a + toNumber(t.amount), 0),
        outcome: inDay.filter((t) => t.type === "outcome").reduce((a, t) => a + toNumber(t.amount), 0)
      };
    });
  }
  return eachMonthOfInterval({ start: fromDate, end: toDate }).map((m) => {
    const inMonth = transactions.filter((t) => isValidDate(t.transaction_date) && isSameMonth(parseISO(t.transaction_date), m));
    return {
      month: format(m, "MMM"),
      income: inMonth.filter((t) => t.type === "income").reduce((a, t) => a + toNumber(t.amount), 0),
      outcome: inMonth.filter((t) => t.type === "outcome").reduce((a, t) => a + toNumber(t.amount), 0)
    };
  });
}

const PANEL = { background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--r)", boxShadow: "var(--sh)" } as const;

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const sp = await searchParams;
  const now = new Date();

  // Pay-cycle aware default range (pay day → today) when none is selected
  const { data: payProfile } = await supabase.from("profiles").select("pay_day").eq("id", user.id).single();
  const cycle = payPeriodRange(payProfile?.pay_day, now);
  const from = isValidDate(sp.from) ? sp.from : ymd(cycle.from);
  const to = isValidDate(sp.to) ? sp.to : ymd(cycle.to);
  const fromDate = parseISO(from);
  const toDate = parseISO(to);

  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const rangeLabel =
    format(fromDate, "yyyy") === format(toDate, "yyyy") && format(fromDate, "MMM") === format(toDate, "MMM")
      ? `${format(fromDate, "d")}–${format(toDate, "d MMM yyyy")}`
      : `${format(fromDate, "d MMM")} – ${format(toDate, "d MMM yyyy")}`;

  const rangeLengthMs = toDate.getTime() - fromDate.getTime();
  const fetchStart = format(new Date(fromDate.getTime() - 24 * 60 * 60 * 1000 - rangeLengthMs), "yyyy-MM-dd");

  const [profileResult, accountsResult, transactionsResult, budgetsResult, subsResult, equityResult, goalsResult, tradesResult] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("accounts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("transactions").select("*").eq("user_id", user.id).gte("transaction_date", fetchStart).order("transaction_date", { ascending: false }).limit(5000),
      supabase.from("budgets").select("*").eq("user_id", user.id),
      supabase.from("subscriptions").select("*").eq("user_id", user.id),
      supabase.from("equity_assets").select("*").eq("user_id", user.id),
      supabase.from("goals").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("realized_trades").select("*").eq("user_id", user.id).order("trade_date", { ascending: false }).limit(6)
    ]);

  const profile = profileResult.data;
  const firstName = (profile?.full_name ?? user.email ?? "there").split(" ")[0];
  const accounts = accountsResult.data ?? [];
  const transactions = transactionsResult.data ?? [];
  const budgets = budgetsResult.data ?? [];
  const subscriptions = subsResult.data ?? [];
  const equityAssets = equityResult.data ?? [];
  const goals = goalsResult.data ?? [];
  const trades = tradesResult.data ?? [];

  const accountName = new Map(accounts.map((a) => [a.id, a.name]));
  const balanceOf = (accountId: string | null) => Number(accounts.find((a) => a.id === accountId)?.current_balance ?? 0);

  // Goals summary — saved tracks the linked Savings wallet balance
  const goalRows = goals.slice(0, 4).map((g) => {
    const target = Number(g.target_amount) || 0;
    const saved = g.wallet_id ? balanceOf(g.wallet_id) : Number(g.current_amount) || 0;
    const pct = target > 0 ? Math.min((saved / target) * 100, 100) : 0;
    return { id: g.id, name: g.name, category: g.category, saved, target, pct, deadline: g.deadline };
  });

  // Investments summary — recent positions/trades
  const tradeRows = trades.slice(0, 4).map((t) => {
    const entry = Number(t.entry_price) || 0;
    const exit = t.exit_price == null ? null : Number(t.exit_price);
    const retPct = !exit || entry <= 0 ? null : ((exit - entry) / entry) * 100;
    return { id: t.id, ticker: t.ordered_item, status: t.status, entry, exit, retPct };
  });

  const income = sumTransactionsInRange(transactions, "income", fromDate, toDate);
  const outcome = sumTransactionsInRange(transactions, "outcome", fromDate, toDate);
  const prevTo = new Date(fromDate.getTime() - 24 * 60 * 60 * 1000);
  const prevFrom = new Date(prevTo.getTime() - rangeLengthMs);
  const previousIncome = sumTransactionsInRange(transactions, "income", prevFrom, prevTo);
  const previousOutcome = sumTransactionsInRange(transactions, "outcome", prevFrom, prevTo);

  // Net balance is cumulative across all wallets and does NOT change with the range.
  const netBalance = calculateNetBalance(accounts);
  const savingsRatio = calculateSavingsRatio(income, outcome);
  const previousSavingsRatio = calculateSavingsRatio(previousIncome, previousOutcome);
  const burnRate = calculateBurnRate(income, outcome);
  const remaining = calculateRemainingBalance(income, outcome);
  const spending = calculateSpendingByCategory(transactions, fromDate, toDate);

  const net = income - outcome;
  const prevNet = previousIncome - previousOutcome;
  const netChg = pct(net, prevNet);
  const incomeChg = pct(income, previousIncome);
  const outcomeChg = pct(outcome, previousOutcome);
  const savingsChg = savingsRatio - previousSavingsRatio;

  const trend = buildSeries(transactions, fromDate, toDate);

  // Real AI insight (fast computed baseline; client refresh swaps in the live model output)
  const insight = await generateBudgetInsightFromData(
    { accounts, transactions, budgets, subscriptions, equityAssets },
    "monthly"
  );

  const recent = transactions
    .filter((t) => isValidDate(t.transaction_date) && parseISO(t.transaction_date) >= fromDate && parseISO(t.transaction_date) <= toDate)
    .slice(0, 6);

  const hasData = accounts.length > 0 || transactions.length > 0;

  return (
    <DashboardShell profile={profile}>
      <section className="mx-auto max-w-[1320px]">
        {/* Header */}
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3.5">
          <div>
            <h1 className="text-[24px] font-bold tracking-[-.01em]">{greeting}, {firstName}</h1>
            <p className="mt-1.5 text-[13.5px]" style={{ color: "var(--muted)" }}>
              Report for <span className="font-semibold" style={{ color: "var(--text)" }}>{rangeLabel}</span> · spending figures update with your selected range.
            </p>
          </div>
          <DashboardHeaderActions />
        </div>

        {!hasData ? (
          <EmptyState title="Welcome to 8888 Tracker." description="Add your first wallet and transaction to generate your dashboard." />
        ) : (
          <>
            {/* Hero row */}
            <div className="mb-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-[1.25fr_1fr_1fr]">
              {/* Net balance — cumulative, spans 2 rows */}
              <div className="flex flex-col p-[18px]" style={{ ...PANEL, gridRow: "span 2" }}>
                <div className="mb-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold tracking-[.07em]" style={{ color: "var(--faint)" }}>NET BALANCE</span>
                    <span className="rounded-[5px] px-[7px] py-0.5 text-[9.5px] font-bold" style={{ background: netBalance >= 0 ? "var(--accentSoft)" : "var(--downSoft)", color: netBalance >= 0 ? "var(--accent)" : "var(--down)" }}>CUMULATIVE</span>
                  </div>
                  <span style={{ color: "var(--faint)" }}>···</span>
                </div>
                <div className="num-balance num text-[30px] font-semibold leading-none">{formatIDR(netBalance)}</div>
                <div className="mt-1.5 text-[11.5px]" style={{ color: "var(--muted)" }}>Total across all wallets</div>

                {/* Dynamic range comparison box */}
                <div className="mt-4 rounded-[12px] p-3" style={{ background: "var(--softer)", border: "1px solid var(--hair)" }}>
                  <div className="mb-1.5 flex items-center justify-between text-[11px]">
                    <span style={{ color: "var(--muted)" }}>Net flow vs previous period</span>
                    <span className="num font-semibold" style={{ color: netChg >= 0 ? "var(--up)" : "var(--down)" }}>{pctLabel(netChg)}</span>
                  </div>
                  <div className="mb-1.5 flex justify-between text-[11px]">
                    <span className="font-semibold">Burn rate</span>
                    <span className="num" style={{ color: "var(--muted)" }}>{formatPercent(burnRate)}</span>
                  </div>
                  <div className="h-[9px] overflow-hidden rounded-[6px]" style={{ background: "var(--soft)" }}>
                    <div className="h-full rounded-[6px]" style={{ width: `${burnRate}%`, background: burnRate >= 90 ? "var(--down)" : "var(--accent)" }} />
                  </div>
                  <div className="mt-2 text-[11.5px]" style={{ color: savingsChg >= 0 ? "var(--up)" : "var(--down)" }}>
                    {savingsChg >= 0 ? "↑" : "↓"} {Math.abs(savingsChg).toFixed(0)}% savings vs previous period
                  </div>
                </div>
                <div className="mt-auto pt-3.5 text-[12px] leading-[1.5]" style={{ color: "var(--muted)", borderTop: "1px solid var(--hair)", marginTop: 14 }}>
                  {burnRate < 80 ? "You are on track to grow your savings this period." : "Spending is high this period — review your budget."}
                </div>
              </div>

              {/* Income */}
              <div className="p-4" style={PANEL}>
                <div className="mb-[11px] flex items-center gap-2">
                  <div className="flex h-[26px] w-[26px] items-center justify-center rounded-[7px]" style={{ background: "var(--accentSoft)", color: "var(--accent)" }}>↓</div>
                  <span className="text-[11px] font-semibold tracking-[.05em]" style={{ color: "var(--faint)" }}>INCOME</span>
                </div>
                <div className="num-balance num text-[22px] font-semibold">{formatIDR(income)}</div>
                <div className="mt-1.5 text-[11px]"><span className="num font-semibold" style={{ color: "var(--accent)" }}>{pctLabel(incomeChg)}</span> <span style={{ color: "var(--muted)" }}>vs last period</span></div>
              </div>

              {/* Expense */}
              <div className="p-4" style={PANEL}>
                <div className="mb-[11px] flex items-center gap-2">
                  <div className="flex h-[26px] w-[26px] items-center justify-center rounded-[7px]" style={{ background: "var(--downSoft)", color: "var(--down)" }}>↑</div>
                  <span className="text-[11px] font-semibold tracking-[.05em]" style={{ color: "var(--faint)" }}>EXPENSE</span>
                </div>
                <div className="num-balance num text-[22px] font-semibold">{formatIDR(outcome)}</div>
                <div className="mt-1.5 text-[11px]"><span className="num font-semibold" style={{ color: "var(--down)" }}>{pctLabel(outcomeChg)}</span> <span style={{ color: "var(--muted)" }}>vs last period</span></div>
              </div>

              {/* Savings ratio */}
              <div className="p-4" style={PANEL}>
                <div className="mb-[11px] text-[11px] font-semibold tracking-[.05em]" style={{ color: "var(--faint)" }}>SAVINGS RATIO</div>
                <div className="num text-[22px] font-semibold">{formatPercent(savingsRatio)}</div>
                <div className="mt-1.5 text-[11px]"><span className="num font-semibold" style={{ color: savingsChg >= 0 ? "var(--up)" : "var(--down)" }}>{pctLabel(savingsChg)}</span> <span style={{ color: "var(--muted)" }}>vs last period</span></div>
              </div>

              {/* Remaining */}
              <div className="p-4" style={PANEL}>
                <div className="mb-[11px] text-[11px] font-semibold tracking-[.05em]" style={{ color: "var(--faint)" }}>REMAINING (RANGE)</div>
                <div className="num-balance num text-[22px] font-semibold">{formatIDR(remaining)}</div>
                <div className="mt-1.5 text-[11px]" style={{ color: "var(--muted)" }}>Income minus expense in range</div>
              </div>
            </div>

            {/* AI insights (includes budget warnings) */}
            <div className="mb-3.5 p-4" style={PANEL}>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-[7px] text-[11px]" style={{ background: "var(--ink)", color: "var(--panel)" }}>✦</div>
                  <span className="text-[11px] font-semibold tracking-[.07em]" style={{ color: "var(--faint)" }}>AI INSIGHTS</span>
                </div>
                <span className="flex items-center gap-1.5 text-[10.5px] font-semibold" style={{ color: "var(--accent)" }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }} />Generated from your latest data</span>
              </div>
              <AsyncInsightText initialInsight={insight.conclusion} period="monthly" className="text-[12.5px] leading-[1.7]" />
            </div>

            {/* Income vs expense (dynamic) + expense pie */}
            <div className="mb-3.5 grid grid-cols-1 gap-3.5 lg:grid-cols-[1.55fr_1fr]">
              <div className="px-[18px] py-4" style={PANEL}>
                <div className="mb-1.5 flex items-center justify-between">
                  <div className="text-[11px] font-semibold tracking-[.07em]" style={{ color: "var(--faint)" }}>INCOME vs EXPENSE · {rangeLabel}</div>
                  <div className="flex gap-3.5 text-[11px]">
                    <span className="flex items-center gap-1.5"><span className="h-[3px] w-3 rounded-[2px]" style={{ background: "var(--up)" }} />Income</span>
                    <span className="flex items-center gap-1.5"><span className="h-[3px] w-3 rounded-[2px]" style={{ background: "var(--down)" }} />Expense</span>
                  </div>
                </div>
                <IncomeOutcomeChart data={trend} />
              </div>

              <div className="p-4" style={PANEL}>
                <div className="mb-3.5 flex items-center justify-between">
                  <div className="text-[11px] font-semibold tracking-[.07em]" style={{ color: "var(--faint)" }}>EXPENSE BREAKDOWN</div>
                  <Link href={`/expenses?from=${from}&to=${to}`} className="text-[11.5px] font-semibold" style={{ color: "var(--accent)" }}>View details ›</Link>
                </div>
                <SpendingBreakdownChart data={spending} />
              </div>
            </div>

            {/* Goals + Investments summary */}
            <div className="mb-3.5 grid grid-cols-1 gap-3.5 lg:grid-cols-2">
              {/* Goals */}
              <div className="p-4" style={PANEL}>
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-[11px] font-semibold tracking-[.07em]" style={{ color: "var(--faint)" }}>GOALS</div>
                  <Link href="/goals" className="text-[11.5px] font-semibold" style={{ color: "var(--accent)" }}>See all ›</Link>
                </div>
                {goalRows.length === 0 ? (
                  <p className="text-[12.5px]" style={{ color: "var(--muted)" }}>No goals yet. <Link href="/goals" style={{ color: "var(--accent)" }}>Add one ›</Link></p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {goalRows.map((g) => {
                      const color = categoryColor(g.category || g.name);
                      return (
                        <div key={g.id} className="flex items-center gap-3">
                          <div className="flex h-8 w-8 flex-[0_0_32px] items-center justify-center rounded-lg text-[12px] font-bold" style={{ background: `${color}22`, color }}>{g.name.slice(0, 1).toUpperCase()}</div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate text-[13px] font-semibold">{g.name}</span>
                              <span className="num shrink-0 text-[11.5px]" style={{ color: "var(--muted)" }}>{formatIDR(g.saved)} / {formatIDR(g.target)}</span>
                            </div>
                            <div className="mt-1.5 flex items-center gap-2">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: "var(--soft)" }}>
                                <div className="h-full rounded-full" style={{ width: `${g.pct}%`, background: color }} />
                              </div>
                              <span className="num w-11 text-right text-[11px] font-semibold" style={{ color }}>{g.pct.toFixed(0)}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Investments */}
              <div className="p-4" style={PANEL}>
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-[11px] font-semibold tracking-[.07em]" style={{ color: "var(--faint)" }}>INVESTMENTS</div>
                  <Link href="/equity" className="text-[11.5px] font-semibold" style={{ color: "var(--accent)" }}>See all ›</Link>
                </div>
                {tradeRows.length === 0 ? (
                  <p className="text-[12.5px]" style={{ color: "var(--muted)" }}>No trades yet. <Link href="/equity" style={{ color: "var(--accent)" }}>Add one ›</Link></p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {tradeRows.map((t) => (
                      <div key={t.id} className="flex items-center gap-3">
                        <div className="flex h-8 w-8 flex-[0_0_32px] items-center justify-center rounded-full text-[10px] font-bold" style={{ background: "var(--ink)", color: "var(--panel)" }}>{t.ticker.slice(0, 2)}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="num truncate text-[13px] font-bold">{t.ticker}</span>
                            <span className="num shrink-0 text-[12.5px] font-semibold">{t.exit == null ? formatIDR(t.entry) : formatIDR(t.exit)}</span>
                          </div>
                          <div className="mt-0.5 flex items-center justify-between gap-2">
                            <span className="text-[11px]" style={{ color: "var(--muted)" }}>
                              {t.status === "open" ? "Open · entry " : "Realized · entry "}<span className="num">{formatIDR(t.entry)}</span>
                            </span>
                            {t.retPct == null ? (
                              <span className="num rounded-[5px] px-1.5 py-0.5 text-[10.5px] font-bold" style={{ background: "var(--warnSoft)", color: "var(--warn)" }}>OPEN</span>
                            ) : (
                              <span className="num rounded-[5px] px-1.5 py-0.5 text-[10.5px] font-bold" style={{ background: t.retPct >= 0 ? "var(--upSoft)" : "var(--downSoft)", color: t.retPct >= 0 ? "var(--up)" : "var(--down)" }}>{t.retPct >= 0 ? "+" : ""}{t.retPct.toFixed(1)}%</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent transactions */}
            <div className="overflow-hidden" style={PANEL}>
              <div className="flex flex-wrap items-center justify-between gap-2.5 px-[18px] py-3.5" style={{ borderBottom: "1px solid var(--hair)" }}>
                <div className="text-[11px] font-semibold tracking-[.07em]" style={{ color: "var(--faint)" }}>TRANSACTIONS · {rangeLabel}</div>
                <Link href="/transactions" className="text-[11.5px] font-semibold" style={{ color: "var(--accent)" }}>View all ›</Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse">
                  <thead>
                    <tr className="text-[10.5px]" style={{ color: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
                      <th className="px-2 py-[11px] pl-[18px] text-left">Date</th>
                      <th className="px-2 py-[11px] text-left">Merchant</th>
                      <th className="px-2 py-[11px] text-left">Category</th>
                      <th className="px-2 py-[11px] text-left">Wallet</th>
                      <th className="px-2 py-[11px] text-right">Fee</th>
                      <th className="px-2 py-[11px] pr-[18px] text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.length === 0 ? (
                      <tr><td colSpan={6} className="px-[18px] py-5 text-[13px]" style={{ color: "var(--muted)" }}>No transactions in this range.</td></tr>
                    ) : recent.map((t) => {
                      const meta = txTypeMeta(t.type);
                      const cc = categoryColor(t.category);
                      const wallet = accountName.get((t.type === "income" ? t.to_account_id : t.from_account_id) ?? "") ?? "—";
                      const label = t.name || t.category;
                      return (
                        <tr key={t.id} style={{ borderBottom: "1px solid var(--hair)" }}>
                          <td className="num whitespace-nowrap px-2 py-[11px] pl-[18px] text-[11.5px]" style={{ color: "var(--muted)" }}>{format(parseISO(t.transaction_date), "d MMM")}</td>
                          <td className="px-2 py-[11px]">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-7 w-7 flex-[0_0_28px] items-center justify-center rounded-lg text-[11px] font-bold" style={{ background: meta.up ? "var(--accentSoft)" : meta.move ? "var(--soft)" : `${cc}22`, color: meta.up ? "var(--up)" : meta.move ? "var(--muted)" : cc }}>{label.slice(0, 1).toUpperCase()}</div>
                              <span className="text-[13px] font-semibold">{label}</span>
                            </div>
                          </td>
                          <td className="px-2 py-[11px]"><span className="inline-flex items-center gap-1.5 rounded-full px-[9px] py-[3px] text-[11px] font-semibold" style={{ background: `${cc}1f`, color: cc }}>{t.category}</span></td>
                          <td className="px-2 py-[11px] text-[12.5px]" style={{ color: "var(--muted)" }}>{wallet}</td>
                          <td className="num px-2 py-[11px] text-right text-[11.5px]" style={{ color: "var(--faint)" }}>{t.fee > 0 ? formatIDR(t.fee).replace("Rp", "").trim() : "—"}</td>
                          <td className="num px-2 py-[11px] pr-[18px] text-right text-[13px] font-semibold" style={{ color: meta.up ? "var(--up)" : "var(--text)" }}>{meta.up ? "+" : "−"}{formatIDR(t.amount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>
    </DashboardShell>
  );
}
