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
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 0, right: 8, top: 12, bottom: 0 }}>
          <defs>
            <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="outcomeFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.28} />
              <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 4" stroke="#e5edf7" />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
          <YAxis tickFormatter={compactIDR} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748b" }} width={72} />
          <Tooltip
            formatter={(value) => formatIDR(Number(value ?? 0))}
            contentStyle={{ borderRadius: 8, border: "1px solid #dbeafe" }}
          />
          <Area type="monotone" dataKey="income" stroke="#0ea5e9" strokeWidth={3} fill="url(#incomeFill)" name="Income" />
          <Area type="monotone" dataKey="outcome" stroke="#f97316" strokeWidth={3} fill="url(#outcomeFill)" name="Outcome" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
