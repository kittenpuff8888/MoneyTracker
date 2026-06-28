"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
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
function rp(n: number) { return `${n < 0 ? "−" : ""}Rp ${id(Math.abs(n))}`; }

export function InvestmentManager({ wallets, trades }: { wallets: Account[]; trades: RealizedTrade[] }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"all" | "realized" | "open">("all");
  const [query, setQuery] = useState("");
  const [walletFilter, setWalletFilter] = useState("all");

  const walletName = (wid: string | null) => wallets.find((w) => w.id === wid)?.name ?? "—";

  const tradingBalance = wallets.reduce((sum, w) => sum + num(w.current_balance), 0);

  const realized = trades.filter((t) => t.status === "realized");
  const openTrades = trades.filter((t) => t.status === "open");
  const totalRealizedPnl = realized.reduce((s, t) => s + num(t.realized_pnl), 0);
  const costBasis = realized.reduce((s, t) => s + num(t.entry_price), 0);
  const cumulativeReturn = costBasis > 0 ? (totalRealizedPnl / costBasis) * 100 : 0;
  const winRate = realized.length ? (realized.filter((t) => num(t.realized_pnl) >= 0).length / realized.length) * 100 : 0;

  const filtered = useMemo(() => {
    let list = trades;
    if (tab !== "all") list = list.filter((t) => t.status === tab);
    if (walletFilter !== "all") list = list.filter((t) => t.wallet_id === walletFilter);
    const q = query.trim().toUpperCase();
    if (q) list = list.filter((t) => t.ordered_item.toUpperCase().includes(q));
    return [...list].sort((a, b) => (a.trade_date < b.trade_date ? 1 : -1));
  }, [trades, tab, walletFilter, query]);

  const summary = [
    { label: "Trading Balance", value: `Rp ${id(tradingBalance)}`, color: "var(--text)", align: "left" as const },
    { label: "Realized P&L", value: rp(totalRealizedPnl), color: totalRealizedPnl >= 0 ? "var(--up)" : "var(--down)", align: "center" as const },
    { label: "Cumulative Return", value: `${cumulativeReturn >= 0 ? "+" : ""}${cumulativeReturn.toFixed(2)}%`, color: cumulativeReturn >= 0 ? "var(--up)" : "var(--down)", align: "center" as const },
    { label: "Win Rate", value: `${winRate.toFixed(0)}%`, color: "var(--text)", align: "center" as const },
    { label: "Open Positions", value: String(openTrades.length), color: "var(--text)", align: "right" as const }
  ];

  const selectStyle = { background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)", boxShadow: "var(--sh)" };

  return (
    <section className="mx-auto">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-bold tracking-[-.01em]">Investment Portfolio</h1>
          <p className="mt-1.5 text-[13.5px]" style={{ color: "var(--muted)" }}>
            Track open positions and realized trades across your Investment wallets.
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
              {(["all", "realized", "open"] as const).map((t) => {
                const active = tab === t;
                return (
                  <button key={t} type="button" onClick={() => setTab(t)} className="rounded-lg px-[15px] py-1.5 text-[12px] font-semibold capitalize transition" style={{ background: active ? "var(--ink)" : "transparent", color: active ? "var(--panel)" : "var(--muted)" }}>{t}</button>
                );
              })}
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-[7px] rounded-[10px] px-[11px] py-2" style={selectStyle}>
              <span className="text-[13px]" style={{ color: "var(--faint)" }}>⌕</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search ticker…" className="num w-[110px] border-none bg-transparent text-[12px] outline-none" style={{ color: "var(--text)" }} />
            </div>
            <select value={walletFilter} onChange={(e) => setWalletFilter(e.target.value)} className="cursor-pointer rounded-[10px] px-[11px] py-[9px] text-[12.5px] outline-none" style={selectStyle}>
              <option value="all">All wallets</option>
              {wallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>

          {/* Performance banner */}
          <div className="mb-3.5 flex flex-wrap justify-center gap-3">
            {[
              { label: "Total Realized P&L", value: rp(totalRealizedPnl), color: totalRealizedPnl >= 0 ? "var(--up)" : "var(--down)" },
              { label: "Cumulative Portfolio Return", value: `${cumulativeReturn >= 0 ? "+" : ""}${cumulativeReturn.toFixed(2)}%`, color: cumulativeReturn >= 0 ? "var(--up)" : "var(--down)" },
              { label: "Win Rate", value: `${winRate.toFixed(0)}%`, color: "var(--text)" }
            ].map((b) => (
              <div key={b.label} className="text-center px-[26px] py-3.5" style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "12px", boxShadow: "var(--sh)" }}>
                <div className="mb-1 text-[11.5px]" style={{ color: "var(--muted)" }}>{b.label}</div>
                <div className="num text-[19px] font-bold" style={{ color: b.color }}>{b.value}</div>
              </div>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState title="No trades here yet." description="Add an open position or log a realized trade to see it listed." />
          ) : (
            <div className="overflow-hidden" style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--r)", boxShadow: "var(--sh)" }}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] border-collapse">
                  <thead>
                    <tr className="text-[10.5px]" style={{ color: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
                      <th className="px-2 py-3 pl-[18px] text-left">Ticker</th>
                      <th className="px-2 py-3 text-left">Wallet Type</th>
                      <th className="px-2 py-3 text-left">Status</th>
                      <th className="px-2 py-3 text-right">Entry Price</th>
                      <th className="px-2 py-3 text-right">Exit Price</th>
                      <th className="px-2 py-3 text-right">Fee</th>
                      <th className="px-2 py-3 text-right">Realized P&amp;L</th>
                      <th className="px-2 py-3 text-right">Return %</th>
                      <th className="px-2 py-3 pr-[18px] text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((t) => {
                      const isOpen = t.status === "open";
                      const entry = num(t.entry_price);
                      const exit = t.exit_price == null ? null : num(t.exit_price);
                      const pnl = num(t.realized_pnl);
                      const retPct = !isOpen && exit != null && entry > 0 ? ((exit - entry) / entry) * 100 : null;
                      return (
                        <tr key={t.id} className="group" style={{ borderBottom: "1px solid var(--hair)" }}>
                          <td className="num px-2 py-[11px] pl-[18px] text-[12.5px] font-bold">{t.ordered_item}</td>
                          <td className="px-2 py-[11px]"><span className="rounded-[6px] px-[9px] py-[3px] text-[11px] font-semibold" style={{ background: "var(--softer)", color: "var(--muted)" }}>{walletName(t.wallet_id)}</span></td>
                          <td className="px-2 py-[11px]"><span className="rounded-[6px] px-[9px] py-[3px] text-[10.5px] font-bold capitalize" style={{ background: isOpen ? "var(--warnSoft)" : "var(--accentSoft)", color: isOpen ? "var(--warn)" : "var(--accent)" }}>{t.status}</span></td>
                          <td className="num px-2 py-[11px] text-right text-[12px]">{id(entry)}</td>
                          <td className="num px-2 py-[11px] text-right text-[12px]">{exit == null ? "—" : id(exit)}</td>
                          <td className="num px-2 py-[11px] text-right text-[12px]" style={{ color: "var(--muted)" }}>{isOpen ? "—" : id(num(t.total_fee))}</td>
                          <td className="num px-2 py-[11px] text-right text-[12px] font-semibold" style={{ color: isOpen ? "var(--faint)" : pnl >= 0 ? "var(--up)" : "var(--down)" }}>{isOpen ? "—" : `${pnl >= 0 ? "+" : "−"}${id(Math.abs(pnl))}`}</td>
                          <td className="num px-2 py-[11px] text-right text-[12px] font-semibold" style={{ color: retPct == null ? "var(--faint)" : retPct >= 0 ? "var(--up)" : "var(--down)" }}>{retPct == null ? "—" : `${retPct >= 0 ? "+" : ""}${retPct.toFixed(1)}%`}</td>
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
  const { register, handleSubmit, control, formState: { errors } } = useForm<TradeValues>({
    resolver: typedZodResolver<TradeValues>(realizedTradeSchema),
    defaultValues: {
      wallet_id: wallets[0]?.id,
      ordered_item: "",
      status: "open",
      entry_price: 0,
      exit_price: null,
      total_fee: 0,
      realized_pnl: 0,
      trade_date: new Date().toISOString().slice(0, 10)
    }
  });

  const status = useWatch({ control, name: "status" });
  const entry = num(useWatch({ control, name: "entry_price" }));
  const exit = num(useWatch({ control, name: "exit_price" }));
  const fee = num(useWatch({ control, name: "total_fee" }));
  const isRealized = status === "realized";
  const previewPnl = isRealized ? exit - entry - fee : 0;
  const previewPct = isRealized && entry > 0 ? ((exit - entry) / entry) * 100 : 0;

  function onSubmit(values: TradeValues) {
    startTransition(async () => {
      try {
        await upsertTrade(values);
        toast.success(values.status === "open" ? "Open position added." : "Realized trade added.");
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
            <div className="text-[16px] font-bold">Add Trade</div>
            <div className="mt-0.5 text-[12px]" style={{ color: "var(--muted)" }}>Open positions track entries; realized trades update the wallet balance.</div>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="flex h-[30px] w-[30px] items-center justify-center rounded-lg" style={{ border: "1px solid var(--border)", color: "var(--muted)" }}>✕</button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="px-[22px] py-5">
            <div className="mb-3.5 grid grid-cols-2 gap-3">
              <div>
                <div className={lbl}>Ticker</div>
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
            <div className="mb-3.5 grid grid-cols-2 gap-3">
              <div>
                <div className={lbl}>Entry price</div>
                <input type="number" step="any" inputMode="numeric" placeholder="1100" {...register("entry_price")} className={`num ${fieldCls}`} style={fieldStyle} />
              </div>
              <div>
                <div className={lbl}>Position</div>
                <select {...register("status")} className={`${fieldCls} cursor-pointer`} style={fieldStyle}>
                  <option value="open">Open</option>
                  <option value="realized">Realized</option>
                </select>
              </div>
            </div>

            {isRealized && (
              <>
                <div className="mb-3.5 grid grid-cols-2 gap-3">
                  <div>
                    <div className={lbl}>Exit price</div>
                    <input type="number" step="any" inputMode="numeric" placeholder="1490" {...register("exit_price")} className={`num ${fieldCls}`} style={fieldStyle} />
                    {errors.exit_price && <span className="text-[11px]" style={{ color: "var(--down)" }}>{errors.exit_price.message}</span>}
                  </div>
                  <div>
                    <div className={lbl}>Fee</div>
                    <div className="flex items-center gap-1.5 rounded-[10px] px-[11px] py-[9px]" style={fieldStyle}>
                      <span className="num text-[12px]" style={{ color: "var(--muted)" }}>Rp</span>
                      <input type="number" step="any" inputMode="numeric" placeholder="2200" {...register("total_fee")} className="num w-full border-none bg-transparent text-[12.5px] outline-none" style={{ color: "var(--text)" }} />
                    </div>
                  </div>
                </div>
                {/* Auto-calculated */}
                <div className="mb-1 grid grid-cols-2 gap-3">
                  <div className="rounded-[10px] px-[11px] py-2.5" style={{ background: "var(--softer)", border: "1px solid var(--hair)" }}>
                    <div className="text-[10.5px]" style={{ color: "var(--faint)" }}>Total Realized P&amp;L (auto)</div>
                    <div className="num text-[14px] font-bold" style={{ color: previewPnl >= 0 ? "var(--up)" : "var(--down)" }}>{previewPnl >= 0 ? "+" : "−"}Rp {id(Math.abs(previewPnl))}</div>
                  </div>
                  <div className="rounded-[10px] px-[11px] py-2.5" style={{ background: "var(--softer)", border: "1px solid var(--hair)" }}>
                    <div className="text-[10.5px]" style={{ color: "var(--faint)" }}>Return % (auto)</div>
                    <div className="num text-[14px] font-bold" style={{ color: previewPct >= 0 ? "var(--up)" : "var(--down)" }}>{previewPct >= 0 ? "+" : ""}{previewPct.toFixed(2)}%</div>
                  </div>
                </div>
              </>
            )}

            <div className="mt-3.5">
              <div className={lbl}>Date</div>
              <input type="date" {...register("trade_date")} className={`num ${fieldCls}`} style={fieldStyle} />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2.5 px-[22px] py-4" style={{ borderTop: "1px solid var(--hair)" }}>
            <button type="button" onClick={onClose} className="rounded-[10px] px-[18px] py-2.5 text-[13px] font-semibold" style={{ border: "1px solid var(--border)", color: "var(--muted)" }}>Cancel</button>
            <button type="submit" disabled={pending} className="rounded-[10px] px-5 py-2.5 text-[13px] font-semibold transition hover:opacity-90 disabled:opacity-50" style={{ background: "var(--ink)", color: "var(--panel)" }}>
              {pending ? "Saving…" : isRealized ? "Save Trade" : "Save Position"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
