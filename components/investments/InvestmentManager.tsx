"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Plus, Save, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { ConfirmDeleteButton } from "@/components/ui/ConfirmDeleteButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { upsertTrade, deleteTrade } from "@/lib/actions/trades";
import { typedZodResolver } from "@/lib/form-resolver";
import { realizedTradeSchema } from "@/lib/validations";
import { formatIDR } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { Account, RealizedTrade } from "@/lib/types";
import type { z } from "zod";

type TradeValues = z.infer<typeof realizedTradeSchema>;

function num(v: number | string | null | undefined) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function monthKey(date: string) { return date.slice(0, 7); }
function monthLabel(key: string) {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function PnlBadge({ value }: { value: number }) {
  return (
    <span className={cn(
      "num inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
      value >= 0
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
        : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
    )}>
      {value >= 0 ? "+" : ""}{formatIDR(value)}
    </span>
  );
}

export function InvestmentManager({ wallets, trades }: { wallets: Account[]; trades: RealizedTrade[] }) {
  const [open, setOpen] = useState(false);

  const tradingBalance = wallets.reduce((sum, w) => sum + num(w.current_balance), 0);
  const totalInvested = wallets.reduce((sum, w) => sum + num(w.starting_balance), 0);
  const netPnl = trades.reduce((sum, t) => sum + num(t.realized_pnl), 0);
  const openPositions = wallets.length;
  const walletName = (id: string | null) => wallets.find((w) => w.id === id)?.name ?? "—";

  const grouped = useMemo(() => {
    const map = new Map<string, RealizedTrade[]>();
    for (const t of [...trades].sort((a, b) => (a.trade_date < b.trade_date ? 1 : -1))) {
      const key = monthKey(t.trade_date);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return Array.from(map.entries());
  }, [trades]);

  const summaryItems = [
    { label: "Portfolio Balance", value: formatIDR(tradingBalance), mono: true },
    { label: "Total Invested", value: formatIDR(totalInvested), mono: true },
    { label: "Open Positions", value: String(openPositions), mono: true },
    { label: "Net Realized P&L", value: formatIDR(netPnl), mono: true, color: netPnl >= 0 ? "text-emerald-400" : "text-red-400" },
    { label: "Total Equity", value: formatIDR(tradingBalance + netPnl), mono: true }
  ];

  return (
    <div className="grid gap-5">
      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-5">
        {summaryItems.map((item) => (
          <div key={item.label} className="flex flex-col gap-1 bg-card px-4 py-4">
            <p className="eyebrow">{item.label}</p>
            <p className={cn("num mt-1 text-lg font-bold", item.color)}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Realized Trades</h2>
          <p className="text-xs text-muted-foreground">Each trade updates the linked Investment wallet balance.</p>
        </div>
        <Button type="button" onClick={() => setOpen(true)} disabled={wallets.length === 0}>
          <Plus size={15} /> Add Trade
        </Button>
      </div>

      {wallets.length === 0 ? (
        <EmptyState title="No Investment wallet yet." description='Create a wallet with type "Investment" on the Wallet page first.' />
      ) : trades.length === 0 ? (
        <EmptyState title="No trades logged yet." description="Add your first realized trade to track performance." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b border-border bg-muted">
                <tr>
                  {["Ordered Item", "Wallet", "Lot", "Price", "Amount", "Fee", "Net", "Realized P&L", "Date", ""].map((h) => (
                    <th key={h} className="eyebrow px-3 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grouped.map(([key, list]) => {
                  const monthPnl = list.reduce((sum, t) => sum + num(t.realized_pnl), 0);
                  return (
                    <Fragment key={key}>
                      {/* Month group header */}
                      <tr className="bg-muted/60">
                        <td colSpan={7} className="px-3 py-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            {monthLabel(key)}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <PnlBadge value={monthPnl} />
                        </td>
                        <td colSpan={2} />
                      </tr>

                      {list.map((t) => {
                        const pnl = num(t.realized_pnl);
                        return (
                          <tr key={t.id} className="border-t border-border transition-colors hover:bg-muted/30">
                            <td className="px-3 py-3 font-semibold">{t.ordered_item}</td>
                            <td className="px-3 py-3 text-muted-foreground">{walletName(t.wallet_id)}</td>
                            <td className="num px-3 py-3 text-right">{num(t.lot)}</td>
                            <td className="num px-3 py-3 text-right">{num(t.price).toLocaleString("id-ID")}</td>
                            <td className="num px-3 py-3 text-right">{num(t.amount_done).toLocaleString("id-ID")}</td>
                            <td className="num px-3 py-3 text-right text-muted-foreground">{num(t.total_fee).toLocaleString("id-ID")}</td>
                            <td className="num px-3 py-3 text-right">{num(t.net_amount).toLocaleString("id-ID")}</td>
                            <td className="px-3 py-3"><PnlBadge value={pnl} /></td>
                            <td className="num px-3 py-3 whitespace-nowrap text-muted-foreground">{t.trade_date}</td>
                            <td className="px-3 py-3">
                              <ConfirmDeleteButton
                                compact
                                itemName={`${t.ordered_item} trade`}
                                successMessage="Trade deleted and wallet updated."
                                onConfirm={() => deleteTrade(t.id)}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {open && <TradeModal wallets={wallets} onClose={() => setOpen(false)} />}
    </div>
  );
}

function TradeModal({ wallets, onClose }: { wallets: Account[]; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<TradeValues>({
    resolver: typedZodResolver<TradeValues>(realizedTradeSchema),
    defaultValues: {
      wallet_id: wallets[0]?.id,
      ordered_item: "",
      lot: 0,
      price: 0,
      amount_done: 0,
      total_fee: 0,
      net_amount: 0,
      realized_pnl: 0,
      trade_date: new Date().toISOString().slice(0, 10)
    }
  });

  function onSubmit(values: TradeValues) {
    startTransition(async () => {
      try {
        await upsertTrade(values);
        toast.success("Trade added and wallet updated.");
        onClose();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to save trade.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-card p-5 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-base font-semibold">Add Realized Trade</h3>
          <button type="button" aria-label="Close" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted">
            <X size={17} />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:col-span-2">
            Investment Wallet
            <Select {...register("wallet_id")}>
              {wallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </Select>
            {errors.wallet_id && <span className="text-xs text-danger">{errors.wallet_id.message}</span>}
          </label>
          <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Ordered Item
            <Input placeholder="e.g. ENRG" {...register("ordered_item")} />
            {errors.ordered_item && <span className="text-xs text-danger">{errors.ordered_item.message}</span>}
          </label>
          <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Date
            <Input type="date" {...register("trade_date")} />
          </label>
          {[
            { label: "Lot", field: "lot" },
            { label: "Price", field: "price" },
            { label: "Amount Done", field: "amount_done" },
            { label: "Total Fee", field: "total_fee" },
            { label: "Net Amount", field: "net_amount" },
            { label: "Realized P&L", field: "realized_pnl" }
          ].map(({ label, field }) => (
            <label key={field} className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
              <Input type="number" step="any" inputMode="decimal" className="num" {...register(field as keyof TradeValues)} />
            </label>
          ))}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={pending}>
              <Save size={15} />
              {pending ? "Saving…" : "Save Trade"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
