"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { compactIDR, formatIDR } from "@/lib/formatters";

type DataPoint = {
  month: string;
  income: number;
  outcome: number;
};

export function IncomeOutcomeChart({ data }: { data: DataPoint[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 0, right: 8, top: 12, bottom: 0 }}>
          <defs>
            <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="outcomeFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#e5484d" stopOpacity={0.22} />
              <stop offset="95%" stopColor="#e5484d" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 91%)" />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "#7d8fa3", fontFamily: "var(--font-mono)" }}
          />
          <YAxis
            tickFormatter={compactIDR}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "#7d8fa3", fontFamily: "var(--font-mono)" }}
            width={76}
          />
          <Tooltip
            formatter={(value, name) => [formatIDR(Number(value ?? 0)), name]}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid hsl(223 14% 92%)",
              background: "#fff",
              fontSize: 12
            }}
          />
          <Area
            type="monotone"
            dataKey="income"
            stroke="#2563eb"
            strokeWidth={2.5}
            fill="url(#incomeFill)"
            name="Income"
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="outcome"
            stroke="#e5484d"
            strokeWidth={2.5}
            fill="url(#outcomeFill)"
            name="Expense"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
