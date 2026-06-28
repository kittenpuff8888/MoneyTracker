"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ConfirmDeleteButton } from "@/components/ui/ConfirmDeleteButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { upsertTrade, deleteTrade } from "@/lib/actions/trades";
import { typedZodResolver } from "@/lib/form-resolver";
import { realizedTradeSchema } from "@/lib/validations";
import type { Account, RealizedTrade } from "@/lib/types";
import type { z } from "zod";

type TradeValues = z.infer<typeof realizedTradeSchema>;

function num(v: number | string | null | undefined) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}
function id(n: number, d = 0) { return Number(n).toLocaleString("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d }); }
function monthKey(date: string) { return date.slice(0, 7); }
function monthLabel(key: string) {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function InvestmentManager({ wallets, trades }: { wallets: Account[]; trades: RealizedTrade[] }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"all" | "realized">("realized");
  const [query, setQuery] = useState("");
  const [walletFilter, setWalletFilter] = useState("all");

  const walletName = (wid: string | null) => wallets.find((w) => w.id === wid)?.name ?? "—";

  const tradingBalance = wallets.reduce((sum, w) => sum + num(w.current_balance), 0);
  const totalInvested = wallets.reduce((sum, w) => sum + num(w.starting_balance), 0);
  const netPnl = trades.reduce((sum, t) => sum + num(t.realized_pnl), 0);

  const filtered = useMemo(() => {
    let list = trades;
    if (walletFilter !== "all") list = list.filter((t) => t.wallet_id === walletFilter);
    const q = query.trim().toUpperCase();
    if (q) list = list.filter((t) => t.ordered_item.toUpperCase().includes(q));
    return list;
  }, [trades, walletFilter, query]);

  const filteredPnl = filtered.reduce((s, t) => s + num(t.realized_pnl), 0);

  const grouped = useMemo(() => {
    const map = new Map<string, RealizedTrade[]>();
    for (const t of [...filtered].sort((a, b) => (a.trade_date < b.trade_date ? 1 : -1))) {
      const key = monthKey(t.trade_date);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const summary = [
    { label: "Trading Balance", value: `Rp ${id(tradingBalance)}`, color: "var(--text)", align: "left" as const },
    { label: "Invested", value: `Rp ${id(totalInvested)}`, color: "var(--text)", align: "center" as const },
    { label: "Open Positions", value: String(wallets.length), color: "var(--text)", align: "center" as const },
    { label: "Net Profit / Loss", value: `${netPnl >= 0 ? "+" : "−"}Rp ${id(Math.abs(netPnl))}`, color: netPnl >= 0 ? "var(--up)" : "var(--down)", align: "center" as const },
    { label: "Total Equity", value: `Rp ${id(tradingBalance)}`, color: "var(--text)", align: "right" as const }
  ];

  const selectStyle = { background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)", boxShadow: "var(--sh)" };

  return (
    <section className="mx-auto">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-bold tracking-[-.01em]">Investment Portfolio</h1>
          <p className="mt-1.5 text-[13.5px]" style={{ color: "var(--muted)" }}>
            Balance reflects realized trades across your Investment wallets · update each trade to keep it live.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={wallets.length === 0}
          className="flex items-center gap-[7px] rounded-[10px] px-[14px] py-[9px] text-[12.5px] font-semibold transition hover:opacity-90 disabled:opacity-50"
          style={{ background: "var(--ink)", color: "var(--panel)" }}
        >
          + Add Trade
        </button>
      </div>

      {/* Summary strip */}
      <div className="mb-4 grid grid-cols-2 overflow-hidden md:grid-cols-5" style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--r)", boxShadow: "var(--sh)" }}>
        {summary.map((s) => (
          <div key={s.label} className="px-4 py-[15px]" style={{ borderRight: "1px solid var(--hair)", textAlign: s.align }}>
            <div className="num-balance num text-[17px] font-semibold" style={{ color: s.color }}>{s.value}</div>
            <div className="mt-[3px] text-[11px]" style={{ color: "var(--muted)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {wallets.length === 0 ? (
        <EmptyState title="No Investment wallet yet." description='Create a wallet with type "Investment" on the Wallet page first.' />
      ) : (
        <>
          {/* Controls */}
          <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
            <div className="flex gap-0.5 rounded-[10px] p-[3px]" style={{ background: "var(--soft)", border: "1px solid var(--border)" }}>
              {(["all", "realized"] as const).map((t) => {
                const active = tab === t;
                return (
                  <button key={t} type="button" onClick={() => setTab(t)} className="rounded-lg px-[15px] py-1.5 text-[12px] font-semibold capitalize transition" style={{ background: active ? "var(--ink)" : "transparent", color: active ? "var(--panel)" : "var(--muted)" }}>{t}</button>
                );
              })}
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-[7px] rounded-[10px] px-[11px] py-2" style={selectStyle}>
              <span className="text-[13px]" style={{ color: "var(--faint)" }}>⌕</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by stock…" className="num w-[120px] border-none bg-transparent text-[12px] outline-none" style={{ color: "var(--text)" }} />
            </div>
            <select value={walletFilter} onChange={(e) => setWalletFilter(e.target.value)} className="cursor-pointer rounded-[10px] px-[11px] py-[9px] text-[12.5px] outline-none" style={selectStyle}>
              <option value="all">All wallets</option>
              {wallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>

          {/* P&L banner */}
          <div className="mb-3.5 flex justify-center">
            <div className="text-center px-[30px] py-3.5" style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "12px", boxShadow: "var(--sh)" }}>
              <div className="mb-1 text-[11.5px]" style={{ color: "var(--muted)" }}>Total Realized P&amp;L ⓘ</div>
              <div className="num text-[19px] font-bold" style={{ color: filteredPnl >= 0 ? "var(--up)" : "var(--down)" }}>{filteredPnl >= 0 ? "+Rp" : "−Rp"} {id(Math.abs(filteredPnl))}</div>
            </div>
          </div>

          {trades.length === 0 ? (
            <EmptyState title="No trades logged yet." description="Add your first realized trade to track performance." />
          ) : (
            <div className="overflow-hidden" style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--r)", boxShadow: "var(--sh)" }}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1040px] border-collapse">
                  <thead>
                    <tr className="text-[10.5px]" style={{ color: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
                      <th className="px-2 py-3 pl-[18px] text-left">Ordered Items</th>
                      <th className="px-2 py-3 text-left">Wallet Type</th>
                      <th className="px-2 py-3 text-right">Lot Done</th>
                      <th className="px-2 py-3 text-right">Price</th>
                      <th className="px-2 py-3 text-right">Amount Done</th>
                      <th className="px-2 py-3 text-right">Total Fee</th>
                      <th className="px-2 py-3 text-right">Net Amount</th>
                      <th className="px-2 py-3 text-right">Realized P&amp;L</th>
                      <th className="px-2 py-3 pr-[18px] text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grouped.map(([key, list]) => {
                      const monthPnl = list.reduce((sum, t) => sum + num(t.realized_pnl), 0);
                      return (
                        <Fragment key={key}>
                          <tr style={{ background: "var(--softer)" }}>
                            <td colSpan={7} className="px-[18px] py-2 text-[11px] font-semibold" style={{ color: "var(--muted)" }}>{monthLabel(key)}</td>
                            <td colSpan={2} className="num px-[18px] py-2 text-right text-[11.5px] font-bold" style={{ color: monthPnl >= 0 ? "var(--up)" : "var(--down)" }}>{monthPnl >= 0 ? "+" : "−"}Rp{id(Math.abs(monthPnl))}</td>
                          </tr>
                          {list.map((t) => {
                            const pnl = num(t.realized_pnl);
                            const price = num(t.price);
                            return (
                              <tr key={t.id} className="group" style={{ borderBottom: "1px solid var(--hair)" }}>
                                <td className="num px-2 py-[11px] pl-[18px] text-[12.5px] font-bold">{t.ordered_item}</td>
                                <td className="px-2 py-[11px]"><span className="rounded-[6px] px-[9px] py-[3px] text-[11px] font-semibold" style={{ background: "var(--softer)", color: "var(--muted)" }}>{walletName(t.wallet_id)}</span></td>
                                <td className="num px-2 py-[11px] text-right text-[12px]">{id(num(t.lot))}</td>
                                <td className="num px-2 py-[11px] text-right text-[12px]">{id(price, price % 1 ? 2 : 0)}</td>
                                <td className="num px-2 py-[11px] text-right text-[12px]">{id(num(t.amount_done))}</td>
                                <td className="num px-2 py-[11px] text-right text-[12px]" style={{ color: "var(--muted)" }}>{id(num(t.total_fee))}</td>
                                <td className="num px-2 py-[11px] text-right text-[12px]">{id(num(t.net_amount))}</td>
                                <td className="num px-2 py-[11px] text-right text-[12px] font-semibold" style={{ color: pnl >= 0 ? "var(--up)" : "var(--down)" }}>{pnl >= 0 ? "+" : "−"}{id(Math.abs(pnl))}</td>
                                <td className="px-2 py-[11px] pr-[18px] text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <span className="num whitespace-nowrap text-[11.5px]" style={{ color: "var(--muted)" }}>{t.trade_date}</span>
                                    <span className="opacity-0 transition group-hover:opacity-100">
                                      <ConfirmDeleteButton compact itemName={`${t.ordered_item} trade`} successMessage="Trade deleted and wallet updated." onConfirm={() => deleteTrade(t.id)} />
                                    </span>
                                  </div>
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
        </>
      )}

      {open && <TradeModal wallets={wallets} onClose={() => setOpen(false)} />}
    </section>
  );
}

const lbl = "mb-1.5 text-[11.5px] font-semibold";
const fieldCls = "w-full rounded-[10px] px-[11px] py-[10px] text-[13px] outline-none";
const fieldStyle = { background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)" } as const;

function TradeModal({ wallets, onClose }: { wallets: Account[]; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<TradeValues>({
    resolver: typedZodResolver<TradeValues>(realizedTradeSchema),
    defaultValues: {
      wallet_id: wallets[0]?.id,
      ordered_item: "",
      lot: 0, price: 0, amount_done: 0, total_fee: 0, net_amount: 0, realized_pnl: 0,
      trade_date: new Date().toISOString().slice(0, 10)
    }
  });

  function onSubmit(values: TradeValues) {
    const lot = num(values.lot), price = num(values.price), fee = num(values.total_fee);
    const amount = lot * price;
    const payload: TradeValues = { ...values, amount_done: amount, net_amount: amount - fee };
    startTransition(async () => {
      try {
        await upsertTrade(payload);
        toast.success("Trade added and wallet updated.");
        onClose();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to save trade.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-6" style={{ background: "rgba(11,14,20,.5)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="animate-fadein w-full max-w-[520px] overflow-hidden" style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "18px", boxShadow: "0 24px 60px rgba(0,0,0,.3)" }}>
        <div className="flex items-center justify-between px-[22px] py-[18px]" style={{ borderBottom: "1px solid var(--hair)" }}>
          <div>
            <div className="text-[16px] font-bold">Add Realized Trade</div>
            <div className="mt-0.5 text-[12px]" style={{ color: "var(--muted)" }}>Updates the linked Investment wallet balance.</div>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="flex h-[30px] w-[30px] items-center justify-center rounded-lg" style={{ border: "1px solid var(--border)", color: "var(--muted)" }}>✕</button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="px-[22px] py-5">
            <div className="mb-3.5 grid grid-cols-2 gap-3">
              <div>
                <div className={lbl}>Ordered item</div>
                <input placeholder="e.g. ENRG" {...register("ordered_item")} className={`num ${fieldCls} uppercase`} style={fieldStyle} />
                {errors.ordered_item && <span className="text-[11px]" style={{ color: "var(--down)" }}>{errors.ordered_item.message}</span>}
              </div>
              <div>
                <div className={lbl}>Wallet type</div>
                <select {...register("wallet_id")} className={`${fieldCls} cursor-pointer`} style={fieldStyle}>
                  {wallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
            </div>
            <div className="mb-3.5 grid grid-cols-3 gap-3">
              <div><div className={lbl}>Lot done</div><input type="number" step="any" inputMode="numeric" placeholder="100" {...register("lot")} className={`num ${fieldCls}`} style={fieldStyle} /></div>
              <div><div className={lbl}>Price</div><input type="number" step="any" inputMode="numeric" placeholder="1100" {...register("price")} className={`num ${fieldCls}`} style={fieldStyle} /></div>
              <div><div className={lbl}>Total fee</div><input type="number" step="any" inputMode="numeric" placeholder="2200" {...register("total_fee")} className={`num ${fieldCls}`} style={fieldStyle} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className={lbl}>Realized P&amp;L</div>
                <div className="flex items-center gap-1.5 rounded-[10px] px-[11px] py-[9px]" style={fieldStyle}>
                  <span className="num text-[12px]" style={{ color: "var(--muted)" }}>Rp</span>
                  <input type="number" step="any" inputMode="numeric" placeholder="-63610" {...register("realized_pnl")} className="num w-full border-none bg-transparent text-[12.5px] outline-none" style={{ color: "var(--text)" }} />
                </div>
              </div>
              <div><div className={lbl}>Date</div><input type="date" {...register("trade_date")} className={`num ${fieldCls}`} style={fieldStyle} /></div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2.5 px-[22px] py-4" style={{ borderTop: "1px solid var(--hair)" }}>
            <button type="button" onClick={onClose} className="rounded-[10px] px-[18px] py-2.5 text-[13px] font-semibold" style={{ border: "1px solid var(--border)", color: "var(--muted)" }}>Cancel</button>
            <button type="submit" disabled={pending} className="rounded-[10px] px-5 py-2.5 text-[13px] font-semibold transition hover:opacity-90 disabled:opacity-50" style={{ background: "var(--ink)", color: "var(--panel)" }}>{pending ? "Saving…" : "Save Trade"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
