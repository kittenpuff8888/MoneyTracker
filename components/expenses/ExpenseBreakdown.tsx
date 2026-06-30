"use client";

import { useMemo, useState } from "react";
import { SpendingBreakdownChart } from "@/components/charts/SpendingBreakdownChart";
import { formatIDR } from "@/lib/formatters";
import { categoryColor } from "@/lib/category-colors";

type ExpenseRow = { id: string; name: string; category: string; amount: number };
type CategoryRow = { category: string; amount: number; count: number; percent: number };

const PANEL = { background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--r)", boxShadow: "var(--sh)" } as const;

export function ExpenseBreakdown({
  expenses,
  byCategory,
  donutData
}: {
  expenses: ExpenseRow[];
  byCategory: CategoryRow[];
  donutData: { category: string; amount: number; percent: number }[];
}) {
  // null = all categories; otherwise the selected category name.
  const [selected, setSelected] = useState<string | null>(null);

  const toggle = (cat: string) => setSelected((cur) => (cur === cat ? null : cat));

  // Top Expenses: individual transactions, filtered by the selected category.
  const topExpenses = useMemo(() => {
    const rows = selected ? expenses.filter((e) => e.category === selected) : expenses;
    return [...rows].sort((a, b) => b.amount - a.amount).slice(0, 12);
  }, [expenses, selected]);

  return (
    <>
      {/* Donut + interactive category list */}
      <div className="mb-3.5 grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        <div className="p-4" style={PANEL}>
          <div className="mb-3.5 text-[11px] font-semibold tracking-[.07em]" style={{ color: "var(--faint)" }}>BY CATEGORY</div>
          <SpendingBreakdownChart data={donutData} />
        </div>

        <div className="overflow-hidden" style={PANEL}>
          <div className="flex items-center justify-between px-[18px] py-3.5" style={{ borderBottom: "1px solid var(--hair)" }}>
            <span className="text-[11px] font-semibold tracking-[.07em]" style={{ color: "var(--faint)" }}>ALL CATEGORIES</span>
            {selected && (
              <button type="button" onClick={() => setSelected(null)} className="text-[11px] font-semibold" style={{ color: "var(--accent)" }}>Clear filter ✕</button>
            )}
          </div>
          <div className="flex max-h-[360px] flex-col overflow-y-auto">
            {byCategory.map((c) => {
              const color = categoryColor(c.category);
              const active = selected === c.category;
              return (
                <button
                  key={c.category}
                  type="button"
                  onClick={() => toggle(c.category)}
                  className="flex items-center gap-3 px-[18px] py-3 text-left transition"
                  style={{ borderBottom: "1px solid var(--hair)", background: active ? "var(--soft)" : "transparent" }}
                >
                  <span className="h-2.5 w-2.5 flex-[0_0_10px] rounded-[3px]" style={{ background: color }} />
                  <span className="w-36 shrink-0 truncate text-[13px] font-semibold" style={{ color: active ? "var(--accent)" : "var(--text)" }}>{c.category}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: "var(--soft)" }}>
                    <div className="h-full rounded-full" style={{ width: `${c.percent}%`, background: color }} />
                  </div>
                  <span className="num w-10 text-right text-[11.5px]" style={{ color: "var(--muted)" }}>{c.percent.toFixed(0)}%</span>
                  <span className="num w-28 shrink-0 text-right text-[13px] font-semibold">{formatIDR(c.amount)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Expenses (filtered by selected category) */}
      <div className="overflow-hidden" style={PANEL}>
        <div className="flex items-center justify-between px-[18px] py-3.5" style={{ borderBottom: "1px solid var(--hair)" }}>
          <span className="text-[11px] font-semibold tracking-[.07em]" style={{ color: "var(--faint)" }}>
            TOP EXPENSES{selected ? ` · ${selected}` : ""}
          </span>
          {selected && (
            <button type="button" onClick={() => setSelected(null)} className="text-[11px] font-semibold" style={{ color: "var(--accent)" }}>Show all</button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse">
            <thead>
              <tr className="text-[10.5px]" style={{ color: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
                <th className="px-3 py-[11px] pl-[18px] text-left">Transaction Name</th>
                <th className="px-3 py-[11px] text-left">Category</th>
                <th className="px-3 py-[11px] pr-[18px] text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {topExpenses.length === 0 ? (
                <tr><td colSpan={3} className="px-[18px] py-5 text-[13px]" style={{ color: "var(--muted)" }}>No expenses in this category.</td></tr>
              ) : topExpenses.map((e) => {
                const color = categoryColor(e.category);
                return (
                  <tr key={e.id} style={{ borderBottom: "1px solid var(--hair)" }}>
                    <td className="px-3 py-[11px] pl-[18px] text-[13px] font-semibold">{e.name}</td>
                    <td className="px-3 py-[11px]">
                      <span className="inline-flex items-center gap-1.5 rounded-full px-[9px] py-[3px] text-[11px] font-semibold" style={{ background: `${color}1f`, color }}>{e.category}</span>
                    </td>
                    <td className="num px-3 py-[11px] pr-[18px] text-right text-[13px] font-semibold" style={{ color: "var(--down)" }}>−{formatIDR(e.amount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
