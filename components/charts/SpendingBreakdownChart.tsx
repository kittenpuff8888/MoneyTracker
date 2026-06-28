"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatIDR, formatPercent } from "@/lib/formatters";
import type { CategoryTotal } from "@/lib/calculations";

const COLORS = ["#2563eb", "#22c55e", "#e5484d", "#f59e0b", "#8b5cf6", "#14b8a6", "#f97316"];

export function SpendingBreakdownChart({ data }: { data: CategoryTotal[] }) {
  if (data.length === 0) {
    return <p className="py-4 text-sm text-muted-foreground">No spending data in this range.</p>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-[160px_1fr]">
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="amount"
              nameKey="category"
              innerRadius={44}
              outerRadius={70}
              paddingAngle={2}
            >
              {data.map((entry, index) => (
                <Cell key={entry.category} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatIDR(Number(value ?? 0))}
              contentStyle={{ borderRadius: 10, border: "1px solid hsl(223 14% 92%)", fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2.5">
        {data.slice(0, 6).map((item, index) => (
          <div key={item.category}>
            <div className="flex justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                {item.category}
              </span>
              <span className="num text-muted-foreground">{formatPercent(item.percent ?? 0)}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-1.5 rounded-full"
                style={{
                  width: `${Math.min(item.percent ?? 0, 100)}%`,
                  backgroundColor: COLORS[index % COLORS.length]
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
