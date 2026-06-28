"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}

function presets() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const last30 = new Date(now);
  last30.setDate(last30.getDate() - 29);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  return [
    { key: "month", label: "This Month", from: fmt(startOfMonth), to: fmt(endOfMonth) },
    { key: "30d", label: "Last 30 Days", from: fmt(last30), to: fmt(now) },
    { key: "year", label: "This Year", from: fmt(startOfYear), to: fmt(now) }
  ];
}

export function DateRangeControl({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);

  function apply(f: string, t: string) {
    router.push(`/dashboard?from=${f}&to=${t}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Calendar size={14} /> Range
      </span>
      <div className="flex items-center gap-1">
        {presets().map((option) => {
          const active = option.from === from && option.to === to;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => apply(option.from, option.to)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition",
                active ? "bg-[#0b0e14] text-white" : "text-muted-foreground hover:bg-slate-100"
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <div className="ml-auto flex items-center gap-1.5 text-xs">
        <input
          type="date"
          value={customFrom}
          onChange={(e) => setCustomFrom(e.target.value)}
          className="num h-8 rounded-lg border border-border bg-white px-2 outline-none focus:border-blue-400"
        />
        <span className="text-muted-foreground">→</span>
        <input
          type="date"
          value={customTo}
          onChange={(e) => setCustomTo(e.target.value)}
          className="num h-8 rounded-lg border border-border bg-white px-2 outline-none focus:border-blue-400"
        />
        <button
          type="button"
          onClick={() => apply(customFrom, customTo)}
          className="h-8 rounded-lg bg-[#0b0e14] px-3 font-semibold text-white transition hover:bg-[#1c2230]"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
