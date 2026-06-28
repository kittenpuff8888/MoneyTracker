"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

function fmt(d: Date) { return d.toISOString().slice(0, 10); }

function presets() {
  const now = new Date();
  const som = new Date(now.getFullYear(), now.getMonth(), 1);
  const eom = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const last30 = new Date(now); last30.setDate(last30.getDate() - 29);
  const soy = new Date(now.getFullYear(), 0, 1);
  return [
    { key: "month", label: "This Month", from: fmt(som), to: fmt(eom) },
    { key: "30d", label: "Last 30 Days", from: fmt(last30), to: fmt(now) },
    { key: "year", label: "This Year", from: fmt(soy), to: fmt(now) }
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
        <Calendar size={13} /> Range
      </span>

      <div className="flex items-center gap-1">
        {presets().map((opt) => {
          const active = opt.from === from && opt.to === to;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => apply(opt.from, opt.to)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition",
                active ? "bg-foreground text-card" : "text-muted-foreground hover:bg-muted"
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <div className="ml-auto flex items-center gap-1.5 text-xs">
        <input
          type="date"
          value={customFrom}
          onChange={(e) => setCustomFrom(e.target.value)}
          className="num h-8 rounded-lg border border-border bg-muted px-2 text-foreground outline-none focus:border-primary"
        />
        <span className="text-muted-foreground">→</span>
        <input
          type="date"
          value={customTo}
          onChange={(e) => setCustomTo(e.target.value)}
          className="num h-8 rounded-lg border border-border bg-muted px-2 text-foreground outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={() => apply(customFrom, customTo)}
          className="h-8 rounded-lg bg-foreground px-3 text-xs font-semibold text-card transition hover:opacity-90"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
