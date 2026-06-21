import { formatPercent } from "@/lib/formatters";

export function FinancialHealthGauge({ score }: { score: number }) {
  const bounded = Math.max(0, Math.min(score, 100));
  return (
    <div className="flex items-center gap-5">
      <div
        className="grid h-28 w-28 place-items-center rounded-full"
        style={{
          background: `conic-gradient(#0ea5e9 ${bounded * 3.6}deg, #e2e8f0 0deg)`
        }}
      >
        <div className="grid h-20 w-20 place-items-center rounded-full bg-white">
          <span className="text-xl font-bold">{formatPercent(bounded)}</span>
        </div>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Financial Health</p>
        <p className="mt-1 text-base font-semibold">Of monthly income saved</p>
        <p className="mt-2 text-xs text-muted-foreground">Higher savings ratio improves this score.</p>
      </div>
    </div>
  );
}
