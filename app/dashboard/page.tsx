import { endOfMonth, format, parseISO, startOfMonth, subMonths } from "date-fns";
import { redirect } from "next/navigation";
import Link from "next/link";
import { IncomeOutcomeChart } from "@/components/charts/IncomeOutcomeChart";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { DashboardHeaderActions } from "@/components/dashboard/HeaderActions";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  calculateBudgetUsage,
  calculateBurnRate,
  calculateNetBalance,
  calculateRemainingBalance,
  calculateSavingsRatio,
  calculateSpendingByCategory,
  sumTransactionsInRange
} from "@/lib/calculations";
import { formatIDR, formatPercent } from "@/lib/formatters";
import { categoryColor, txTypeMeta } from "@/lib/category-colors";
import { createClient } from "@/lib/supabase/server";

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
  const defaultFrom = format(startOfMonth(now), "yyyy-MM-dd");
  const defaultTo = format(endOfMonth(now), "yyyy-MM-dd");
  const from = isValidDate(sp.from) ? sp.from : defaultFrom;
  const to = isValidDate(sp.to) ? sp.to : defaultTo;
  const fromDate = parseISO(from);
  const toDate = parseISO(to);

  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const rangeLabel =
    format(fromDate, "yyyy") === format(toDate, "yyyy") && format(fromDate, "MMM") === format(toDate, "MMM")
      ? `${format(fromDate, "d")}–${format(toDate, "d MMM yyyy")}`
      : `${format(fromDate, "d MMM")} – ${format(toDate, "d MMM yyyy")}`;

  const sixMonthsAgoDate = startOfMonth(subMonths(now, 5));
  const sixMonthsAgo = format(sixMonthsAgoDate, "yyyy-MM-dd");
  const rangeLengthMs = toDate.getTime() - fromDate.getTime();
  const prevPeriodStart = new Date(fromDate.getTime() - 24 * 60 * 60 * 1000 - rangeLengthMs);
  const fetchStart = format(
    new Date(Math.min(prevPeriodStart.getTime(), sixMonthsAgoDate.getTime())),
    "yyyy-MM-dd"
  );

  const [profileResult, accountsResult, transactionsResult, budgetsResult, monthlyResult] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("accounts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("transactions").select("*").eq("user_id", user.id).gte("transaction_date", fetchStart).order("transaction_date", { ascending: false }).limit(5000),
      supabase.from("budgets").select("*").eq("user_id", user.id),
      supabase.from("monthly_summary").select("*").eq("user_id", user.id).gte("month", sixMonthsAgo).order("month", { ascending: true })
    ]);

  const profile = profileResult.data;
  const firstName = (profile?.full_name ?? user.email ?? "there").split(" ")[0];
  const accounts = accountsResult.data ?? [];
  const transactions = transactionsResult.data ?? [];
  const budgets = budgetsResult.data ?? [];
  const monthlyRows = monthlyResult.data ?? [];

  const accountName = new Map(accounts.map((a) => [a.id, a.name]));

  const income = sumTransactionsInRange(transactions, "income", fromDate, toDate);
  const outcome = sumTransactionsInRange(transactions, "outcome", fromDate, toDate);
  const prevTo = new Date(fromDate.getTime() - 24 * 60 * 60 * 1000);
  const prevFrom = new Date(prevTo.getTime() - rangeLengthMs);
  const previousIncome = sumTransactionsInRange(transactions, "income", prevFrom, prevTo);
  const previousOutcome = sumTransactionsInRange(transactions, "outcome", prevFrom, prevTo);

  const netBalance = calculateNetBalance(accounts);
  const savingsRatio = calculateSavingsRatio(income, outcome);
  const previousSavingsRatio = calculateSavingsRatio(previousIncome, previousOutcome);
  const burnRate = calculateBurnRate(income, outcome);
  const remaining = calculateRemainingBalance(income, outcome);
  const budgetUsage = calculateBudgetUsage(budgets, transactions);
  const warnings = budgetUsage.filter((item) => item.percentUsed >= 75).sort((a, b) => b.percentUsed - a.percentUsed).slice(0, 3);
  const spending = calculateSpendingByCategory(transactions, fromDate, toDate);
  const spendMax = Math.max(1, ...spending.map((s) => s.amount));

  const net = income - outcome;
  const prevNet = previousIncome - previousOutcome;
  const netChg = pct(net, prevNet);
  const incomeChg = pct(income, previousIncome);
  const outcomeChg = pct(outcome, previousOutcome);
  const savingsChg = savingsRatio - previousSavingsRatio;

  const trend = Array.from({ length: 6 }, (_, i) => {
    const month = startOfMonth(subMonths(now, 5 - i));
    const key = format(month, "yyyy-MM-dd");
    const summary = monthlyRows.find((row) => row.month === key);
    return {
      month: format(month, "MMM"),
      income: Number(summary?.total_income ?? 0),
      outcome: Number(summary?.total_outcome ?? 0)
    };
  });

  // Real-data insights
  const insights: { title: string; body: string; bg: string; color: string; icon: string }[] = [];
  if (spending[0]) {
    insights.push({
      title: `${spending[0].category} leads spending`,
      body: `at ${Math.round(spending[0].percent ?? 0)}% of expenses this range — ${formatIDR(spending[0].amount)}.`,
      bg: "var(--downSoft)", color: "var(--down)", icon: "M12 2v20M5 9l7-7 7 7"
    });
  }
  insights.push(
    net >= 0
      ? { title: "Net positive period", body: `you saved ${formatIDR(net)} so far this range. Keep it up.`, bg: "var(--accentSoft)", color: "var(--accent)", icon: "M20 6L9 17l-5-5" }
      : { title: "Spending over income", body: `you are ${formatIDR(Math.abs(net))} short this range — ease off discretionary spend.`, bg: "var(--downSoft)", color: "var(--down)", icon: "M12 2v20M5 9l7-7 7 7" }
  );
  insights.push(
    warnings.length > 0
      ? { title: `${warnings.length} budget${warnings.length > 1 ? "s" : ""} running hot`, body: `${warnings[0].budget.category} is at ${formatPercent(warnings[0].percentUsed)} of its limit.`, bg: "var(--warnSoft)", color: "var(--warn)", icon: "M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" }
      : { title: "Budgets on track", body: "every category is within its limit this period.", bg: "var(--accentSoft)", color: "var(--accent)", icon: "M20 6L9 17l-5-5" }
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
              Report for <span className="font-semibold" style={{ color: "var(--text)" }}>{rangeLabel}</span> · all figures update with your selected range.
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
              {/* Net balance — spans 2 rows */}
              <div className="flex flex-col p-[18px]" style={{ ...PANEL, gridRow: "span 2" }}>
                <div className="mb-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold tracking-[.07em]" style={{ color: "var(--faint)" }}>NET BALANCE</span>
                    <span className="rounded-[5px] px-[7px] py-0.5 text-[9.5px] font-bold" style={{ background: net >= 0 ? "var(--accentSoft)" : "var(--downSoft)", color: net >= 0 ? "var(--accent)" : "var(--down)" }}>{net >= 0 ? "SAFE" : "TIGHT"}</span>
                  </div>
                  <span style={{ color: "var(--faint)" }}>···</span>
                </div>
                <div className="mb-1.5 flex items-end gap-[9px]">
                  <div className="num-balance num text-[30px] font-semibold leading-none">{formatIDR(netBalance)}</div>
                  <div className="num mb-[3px] text-[12px] font-semibold" style={{ color: netChg >= 0 ? "var(--up)" : "var(--down)" }}>{pctLabel(netChg)}</div>
                </div>
                <div className="mb-4 text-[11.5px]" style={{ color: "var(--muted)" }}>vs previous period</div>
                <div className="mb-1.5 flex justify-between text-[11px]">
                  <span className="font-semibold">Burn rate</span>
                  <span className="num" style={{ color: "var(--muted)" }}>{formatPercent(burnRate)}</span>
                </div>
                <div className="mb-2 h-[9px] overflow-hidden rounded-[6px]" style={{ background: "var(--soft)" }}>
                  <div className="h-full rounded-[6px]" style={{ width: `${burnRate}%`, background: "var(--accent)" }} />
                </div>
                <div className="text-[11.5px]" style={{ color: savingsChg >= 0 ? "var(--up)" : "var(--down)" }}>
                  {savingsChg >= 0 ? "↑" : "↓"} {Math.abs(savingsChg).toFixed(0)}% vs last period savings
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

            {/* AI insights + budget warnings */}
            <div className="mb-3.5 grid grid-cols-1 gap-3.5 lg:grid-cols-[1.3fr_1fr]">
              <div className="p-4" style={PANEL}>
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-[7px] text-[11px]" style={{ background: "var(--ink)", color: "var(--panel)" }}>✦</div>
                    <span className="text-[11px] font-semibold tracking-[.07em]" style={{ color: "var(--faint)" }}>AI INSIGHTS</span>
                  </div>
                  <span className="flex items-center gap-1.5 text-[10.5px] font-semibold" style={{ color: "var(--accent)" }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }} />Updated after your last entry</span>
                </div>
                <div className="flex flex-col gap-[11px]">
                  {insights.map((it, i) => (
                    <div key={i} className="flex items-start gap-[11px]">
                      <div className="flex h-[30px] w-[30px] flex-[0_0_30px] items-center justify-center rounded-lg" style={{ background: it.bg, color: it.color }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={it.icon} /></svg>
                      </div>
                      <div className="text-[12.5px] leading-[1.5]"><span className="font-semibold">{it.title}</span> <span style={{ color: "var(--muted)" }}>{it.body}</span></div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4" style={PANEL}>
                <div className="mb-3 text-[11px] font-semibold tracking-[.07em]" style={{ color: "var(--faint)" }}>BUDGET ALMOST EXCEEDED</div>
                {warnings.length === 0 ? (
                  <p className="text-[12.5px]" style={{ color: "var(--muted)" }}>No budgets above 75% this period.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {warnings.map((b) => {
                      const over = b.percentUsed >= 100;
                      const color = categoryColor(b.budget.category);
                      const barColor = over ? "var(--down)" : b.percentUsed >= 90 ? "var(--warn)" : color;
                      return (
                        <div key={b.budget.id}>
                          <div className="mb-1.5 flex justify-between text-[12px]">
                            <span className="flex items-center gap-[7px]"><span className="h-2 w-2 rounded-[3px]" style={{ background: color }} />{b.budget.category}</span>
                            <span className="num font-semibold" style={{ color: over ? "var(--down)" : "var(--warn)" }}>{over ? "Over" : `${formatPercent(b.percentUsed)} used`}</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-[4px]" style={{ background: "var(--soft)" }}>
                            <div className="h-full rounded-[4px]" style={{ width: `${Math.min(b.percentUsed, 100)}%`, background: barColor }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Income vs expense + breakdown */}
            <div className="mb-3.5 grid grid-cols-1 gap-3.5 lg:grid-cols-[1.55fr_1fr]">
              <div className="px-[18px] py-4" style={PANEL}>
                <div className="mb-1.5 flex items-center justify-between">
                  <div className="text-[11px] font-semibold tracking-[.07em]" style={{ color: "var(--faint)" }}>INCOME vs EXPENSE</div>
                  <div className="flex gap-3.5 text-[11px]">
                    <span className="flex items-center gap-1.5"><span className="h-[3px] w-3 rounded-[2px]" style={{ background: "var(--up)" }} />Income</span>
                    <span className="flex items-center gap-1.5"><span className="h-[3px] w-3 rounded-[2px]" style={{ background: "var(--down)" }} />Expense</span>
                  </div>
                </div>
                <div className="h-[260px]"><IncomeOutcomeChart data={trend} /></div>
              </div>

              <div className="p-4" style={PANEL}>
                <div className="mb-3.5 text-[11px] font-semibold tracking-[.07em]" style={{ color: "var(--faint)" }}>SPENDING BREAKDOWN</div>
                {spending.length === 0 ? (
                  <p className="text-[12.5px]" style={{ color: "var(--muted)" }}>No spending in this range.</p>
                ) : (
                  <div className="flex flex-col gap-[13px]">
                    {spending.slice(0, 6).map((b) => {
                      const color = categoryColor(b.category);
                      return (
                        <div key={b.category}>
                          <div className="mb-1.5 flex justify-between text-[12px]">
                            <span className="font-semibold">{b.category}</span>
                            <span className="num" style={{ color: "var(--muted)" }}>{Math.round(b.percent ?? 0)}%</span>
                          </div>
                          <div className="flex items-center gap-[9px]">
                            <div className="h-2 flex-1 overflow-hidden rounded-[5px]" style={{ background: "var(--soft)" }}>
                              <div className="h-full rounded-[5px]" style={{ width: `${Math.round((b.amount / spendMax) * 100)}%`, background: color }} />
                            </div>
                            <span className="num w-16 text-right text-[11px] font-semibold">{formatIDR(b.amount)}</span>
                          </div>
                        </div>
                      );
                    })}
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
