"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Plus, Save, TrendingUp, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { ConfirmDeleteButton } from "@/components/ui/ConfirmDeleteButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { upsertTrade, deleteTrade } from "@/lib/actions/trades";
import { typedZodResolver } from "@/lib/form-resolver";
import { realizedTradeSchema } from "@/lib/validations";
import { formatIDR } from "@/lib/formatters";
import type { Account, RealizedTrade } from "@/lib/types";
import type { z } from "zod";

type TradeValues = z.infer<typeof realizedTradeSchema>;

function num(v: number | string | null | undefined) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function monthKey(date: string) {
  return date.slice(0, 7); // yyyy-MM
}

function monthLabel(key: string) {
  const [y, m] = key.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function InvestmentManager({ wallets, trades }: { wallets: Account[]; trades: RealizedTrade[] }) {
  const [open, setOpen] = useState(false);

  const tradingBalance = wallets.reduce((sum, w) => sum + num(w.current_balance), 0);
  const netPnl = trades.reduce((sum, t) => sum + num(t.realized_pnl), 0);
  const totalFees = trades.reduce((sum, t) => sum + num(t.total_fee), 0);
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

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent><p className="text-sm text-muted-foreground">Trading Balance</p><p className="mt-2 text-2xl font-bold">{formatIDR(tradingBalance)}</p></CardContent></Card>
        <Card><CardContent><p className="text-sm text-muted-foreground">Net Realized P&amp;L</p><p className={netPnl >= 0 ? "mt-2 text-2xl font-bold text-emerald-600" : "mt-2 text-2xl font-bold text-rose-600"}>{formatIDR(netPnl)}</p></CardContent></Card>
        <Card><CardContent><p className="text-sm text-muted-foreground">Total Fees</p><p className="mt-2 text-2xl font-bold">{formatIDR(totalFees)}</p></CardContent></Card>
        <Card><CardContent><p className="text-sm text-muted-foreground">Total Equity</p><p className="mt-2 text-2xl font-bold">{formatIDR(tradingBalance)}</p></CardContent></Card>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Realized Trades</h2>
          <p className="text-sm text-muted-foreground">Each trade updates the linked Investment wallet balance.</p>
        </div>
        <Button type="button" onClick={() => setOpen(true)} disabled={wallets.length === 0}>
          <Plus size={16} />
          Add Trade
        </Button>
      </div>

      {wallets.length === 0 ? (
        <EmptyState
          title="No Investment wallet yet."
          description="Create a wallet with type Investment on the Wallet page first, then log trades here."
        />
      ) : trades.length === 0 ? (
        <EmptyState title="No trades logged yet." description="Add your first realized trade to start tracking performance." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-sky-50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-3">Ordered Items</th>
                  <th className="px-3 py-3">Wallet Type</th>
                  <th className="px-3 py-3 text-right">Lot Done</th>
                  <th className="px-3 py-3 text-right">Price</th>
                  <th className="px-3 py-3 text-right">Amount Done</th>
                  <th className="px-3 py-3 text-right">Total Fee</th>
                  <th className="px-3 py-3 text-right">Net Amount</th>
                  <th className="px-3 py-3 text-right">Realized P&amp;L</th>
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {grouped.map(([key, list]) => {
                  const monthPnl = list.reduce((sum, t) => sum + num(t.realized_pnl), 0);
                  return (
                    <Fragment key={key}>
                      <tr className="bg-slate-50">
                        <td colSpan={7} className="px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">{monthLabel(key)}</td>
                        <td className={monthPnl >= 0 ? "px-3 py-2 text-right text-xs font-semibold text-emerald-600" : "px-3 py-2 text-right text-xs font-semibold text-rose-600"}>{formatIDR(monthPnl)}</td>
                        <td colSpan={2}></td>
                      </tr>
                      {list.map((t) => {
                        const pnl = num(t.realized_pnl);
                        return (
                          <tr key={t.id}>
                            <td className="px-3 py-3 font-semibold">{t.ordered_item}</td>
                            <td className="px-3 py-3 text-muted-foreground">{walletName(t.wallet_id)}</td>
                            <td className="px-3 py-3 text-right">{num(t.lot)}</td>
                            <td className="px-3 py-3 text-right">{num(t.price).toLocaleString("id-ID")}</td>
                            <td className="px-3 py-3 text-right">{num(t.amount_done).toLocaleString("id-ID")}</td>
                            <td className="px-3 py-3 text-right">{num(t.total_fee).toLocaleString("id-ID")}</td>
                            <td className="px-3 py-3 text-right">{num(t.net_amount).toLocaleString("id-ID")}</td>
                            <td className={pnl >= 0 ? "px-3 py-3 text-right font-medium text-emerald-600" : "px-3 py-3 text-right font-medium text-rose-600"}>{formatIDR(pnl)}</td>
                            <td className="px-3 py-3 whitespace-nowrap">{t.trade_date}</td>
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

      {open ? <TradeModal wallets={wallets} onClose={() => setOpen(false)} /> : null}
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
      <button type="button" aria-label="Close" className="absolute inset-0 bg-slate-950/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl rounded-xl bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-semibold"><TrendingUp size={18} className="text-sky-600" /> Add Realized Trade</h3>
          <button type="button" aria-label="Close" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-slate-100"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium sm:col-span-2">
            Investment Wallet
            <Select {...register("wallet_id")}>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </Select>
            {errors.wallet_id && <span className="text-xs text-rose-600">{errors.wallet_id.message}</span>}
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Ordered Item
            <Input placeholder="e.g. ENRG" {...register("ordered_item")} />
            {errors.ordered_item && <span className="text-xs text-rose-600">{errors.ordered_item.message}</span>}
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Date
            <Input type="date" {...register("trade_date")} />
          </label>
          <label className="grid gap-1 text-sm font-medium">Lot Done<Input type="number" step="any" inputMode="decimal" {...register("lot")} /></label>
          <label className="grid gap-1 text-sm font-medium">Price<Input type="number" step="any" inputMode="decimal" {...register("price")} /></label>
          <label className="grid gap-1 text-sm font-medium">Amount Done<Input type="number" step="any" inputMode="decimal" {...register("amount_done")} /></label>
          <label className="grid gap-1 text-sm font-medium">Total Fee<Input type="number" step="any" inputMode="decimal" {...register("total_fee")} /></label>
          <label className="grid gap-1 text-sm font-medium">Net Amount<Input type="number" step="any" inputMode="decimal" {...register("net_amount")} /></label>
          <label className="grid gap-1 text-sm font-medium">Realized P&amp;L<Input type="number" step="any" inputMode="decimal" {...register("realized_pnl")} /></label>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={pending}><Save size={16} />{pending ? "Saving..." : "Save Trade"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
