"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatIDR, formatPercent } from "@/lib/formatters";
import type { CategoryTotal } from "@/lib/calculations";

const colors = ["#0ea5e9", "#22c55e", "#f97316", "#ef4444", "#a3e635", "#6366f1", "#14b8a6"];

export function SpendingBreakdownChart({ data }: { data: CategoryTotal[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-[180px_1fr]">
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="amount" nameKey="category" innerRadius={48} outerRadius={78} paddingAngle={3}>
              {data.map((entry, index) => (
                <Cell key={entry.category} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatIDR(Number(value ?? 0))} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-3">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No spending categories yet.</p>
        ) : (
          data.slice(0, 6).map((item, index) => (
            <div key={item.category}>
              <div className="flex justify-between text-sm">
                <span className="font-medium">{item.category}</span>
                <span className="text-muted-foreground">{formatPercent(item.percent ?? 0)}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full"
                  style={{ width: `${Math.min(item.percent ?? 0, 100)}%`, backgroundColor: colors[index % colors.length] }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
