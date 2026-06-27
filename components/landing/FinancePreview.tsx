import { ArrowUpRight, Sparkles, WalletCards } from "lucide-react";

export function FinancePreview() {
  return (
    <div aria-label="Money Tracker dashboard preview" className="relative mx-auto w-full max-w-xl">
      <div className="absolute inset-6 rounded-full bg-sky-100/80 blur-3xl" />
      <div className="relative grid grid-cols-2 gap-3 sm:gap-4">
        <div className="col-span-2 rounded-lg border border-sky-100 bg-white p-4 shadow-soft sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Net balance</p>
              <p className="mt-2 text-2xl font-bold sm:text-3xl">Rp 12.450.000</p>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-sky-50 text-sky-600">
              <WalletCards size={19} />
            </span>
          </div>
          <div className="mt-4 flex h-12 items-end gap-1.5" aria-hidden="true">
            {[36, 52, 44, 70, 58, 82, 74, 96].map((height, index) => (
              <span
                key={height}
                className={index > 5 ? "flex-1 rounded-sm bg-emerald-400" : "flex-1 rounded-sm bg-sky-200"}
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-sky-100 bg-white p-4 shadow-card">
          <div className="flex items-center gap-2 text-orange-500">
            <ArrowUpRight size={16} />
            <p className="text-xs font-semibold">Outcome</p>
          </div>
          <p className="mt-3 text-lg font-bold sm:text-xl">Rp 4,8 jt</p>
          <p className="mt-1 text-xs text-muted-foreground">64% of income</p>
        </div>

        <div className="rounded-lg border border-sky-100 bg-white p-4 shadow-card">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold">Savings</span>
            <span className="text-emerald-600">72%</span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-slate-100">
            <div className="h-2 w-[72%] rounded-full bg-emerald-400" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Goal on track</p>
        </div>

        <div className="col-span-2 hidden rounded-lg border border-sky-100 bg-white p-4 shadow-card sm:block">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Groceries</p>
              <p className="mt-1 text-xs text-muted-foreground">Today, 18:40</p>
            </div>
            <p className="shrink-0 text-sm font-bold text-orange-600">-Rp 185.000</p>
          </div>
        </div>

        <div className="col-span-2 hidden rounded-lg border border-sky-100 bg-white p-4 shadow-card sm:block">
          <div className="flex items-center gap-2 text-sky-600">
            <Sparkles size={15} />
            <p className="text-xs font-semibold">Smart insight</p>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-600">Dining is down 12% this week.</p>
        </div>
      </div>
    </div>
  );
}
