"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatIDR, formatPercent } from "@/lib/formatters";
import { categoryColor } from "@/lib/category-colors";
import type { CategoryTotal } from "@/lib/calculations";

export function SpendingBreakdownChart({ data }: { data: CategoryTotal[] }) {
  if (data.length === 0) {
    return <p className="py-4 text-sm" style={{ color: "var(--muted)" }}>No spending data in this range.</p>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-[150px_1fr]">
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="amount" nameKey="category" innerRadius={42} outerRadius={68} paddingAngle={2}>
              {data.map((entry) => (
                <Cell key={entry.category} stroke="var(--panel)" strokeWidth={2} fill={categoryColor(entry.category)} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatIDR(Number(value ?? 0))}
              contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)", fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2.5">
        {data.slice(0, 6).map((item) => {
          const color = categoryColor(item.category);
          return (
            <div key={item.category}>
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                  {item.category}
                </span>
                <span className="num" style={{ color: "var(--muted)" }}>{formatPercent(item.percent ?? 0)}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--soft)" }}>
                <div className="h-1.5 rounded-full" style={{ width: `${Math.min(item.percent ?? 0, 100)}%`, backgroundColor: color }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
