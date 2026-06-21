"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatIDR } from "@/lib/formatters";
import type { EquityAsset } from "@/lib/types";

const colors = ["#0ea5e9", "#22c55e", "#a3e635", "#f97316", "#6366f1", "#14b8a6", "#ef4444"];

export function EquityAllocationChart({ assets }: { assets: EquityAsset[] }) {
  const data = assets.map((asset) => ({ name: asset.name, value: Number(asset.current_value ?? 0) }));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3}>
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => formatIDR(Number(value ?? 0))} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
