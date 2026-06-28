"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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

  const options = presets();

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
          <Calendar size={15} /> Range
        </span>
        {options.map((option) => {
          const active = option.from === from && option.to === to;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => apply(option.from, option.to)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-xs font-medium transition",
                active ? "border-sky-500 bg-sky-50 text-sky-700" : "border-border text-muted-foreground hover:border-sky-300"
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="h-9 w-auto" />
        <span className="text-muted-foreground">→</span>
        <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="h-9 w-auto" />
        <Button type="button" className="h-9 px-3" onClick={() => apply(customFrom, customTo)}>Apply</Button>
      </div>
    </div>
  );
}
