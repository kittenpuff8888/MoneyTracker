"use client";

import { format, parseISO } from "date-fns";
import { Pencil } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { ConfirmDeleteButton } from "@/components/ui/ConfirmDeleteButton";
import { deleteTransaction, settleCovering } from "@/lib/actions/transactions";
import { formatIDR } from "@/lib/formatters";
import { categoryColor, txTypeMeta } from "@/lib/category-colors";
import type { Account, Transaction } from "@/lib/types";

const KNOWN_METHODS = ["QRIS", "Transfer", "Card", "VA", "Cash", "E-Money"];
function methodOf(notes: string | null): string {
  if (!notes) return "—";
  const first = notes.split("·")[0].trim();
  return KNOWN_METHODS.includes(first) ? first : "—";
}
function dateLabel(d: string) {
  try { return format(parseISO(d), "d MMM"); } catch { return d; }
}

function SettleButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(async () => {
        try { await settleCovering(id); toast.success("Marked as settled. Balance restored."); }
        catch (e) { toast.error(e instanceof Error ? e.message : "Failed to settle."); }
      })}
      className="rounded-[6px] px-2 py-[3px] text-[10.5px] font-semibold transition hover:opacity-80 disabled:opacity-50"
      style={{ background: "var(--warnSoft)", color: "var(--warn)" }}
    >
      {pending ? "…" : "Settle"}
    </button>
  );
}

export function TransactionTable({
  transactions,
  accounts,
  onEdit
}: {
  transactions: Transaction[];
  accounts: Account[];
  onEdit?: (transaction: Transaction) => void;
}) {
  const accountName = (id: string | null) => accounts.find((a) => a.id === id)?.name ?? "—";

  return (
    <>
      {/* Mobile cards */}
      <div className="grid gap-2 md:hidden">
        {transactions.map((t) => {
          const isCovering = t.type === "covering";
          const meta = txTypeMeta(t.type);
          const cc = isCovering ? "#f59e0b" : categoryColor(t.category);
          const label = t.name || (isCovering ? `Cover Bill` : t.category);
          return (
            <article key={t.id} className="p-4" style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--r)", boxShadow: "var(--sh)" }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-8 w-8 flex-[0_0_32px] items-center justify-center rounded-lg text-[12px] font-bold" style={{ background: isCovering ? "#f59e0b22" : meta.up ? "var(--accentSoft)" : meta.move ? "var(--soft)" : `${cc}22`, color: isCovering ? "#f59e0b" : meta.up ? "var(--up)" : meta.move ? "var(--muted)" : cc }}>
                    {isCovering ? "↗" : label.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold">{label}</p>
                    <p className="text-[11px]" style={{ color: "var(--muted)" }}>
                      {dateLabel(t.transaction_date)} · {isCovering ? `for ${t.covered_for ?? "—"} · ${t.is_settled ? "Settled" : "Pending"}` : t.category}
                    </p>
                  </div>
                </div>
                <p className="num shrink-0 text-right text-[13px] font-bold" style={{ color: isCovering ? "#f59e0b" : meta.up ? "var(--up)" : "var(--text)" }}>
                  −{formatIDR(t.amount)}
                </p>
              </div>
              <div className="mt-3 flex justify-end gap-2 pt-3" style={{ borderTop: "1px solid var(--hair)" }}>
                {isCovering && !t.is_settled && <SettleButton id={t.id} />}
                {!isCovering && (
                  <button type="button" onClick={() => onEdit?.(t)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold" style={{ border: "1px solid var(--border)", color: "var(--muted)" }}>
                    <Pencil size={13} /> Edit
                  </button>
                )}
                <ConfirmDeleteButton compact itemName={`${label} transaction`} successMessage="Transaction deleted and balances updated." onConfirm={() => deleteTransaction(t.id)} />
              </div>
            </article>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden md:block" style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--r)", boxShadow: "var(--sh)" }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] border-collapse">
            <thead>
              <tr className="text-[10.5px]" style={{ color: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
                <th className="px-2 py-3 pl-[18px] text-left">Date</th>
                <th className="px-2 py-3 text-left">Merchant</th>
                <th className="px-2 py-3 text-left">Category</th>
                <th className="px-2 py-3 text-left">Type</th>
                <th className="px-2 py-3 text-left">Wallet</th>
                <th className="px-2 py-3 text-center">Method</th>
                <th className="px-2 py-3 text-right">Fee</th>
                <th className="px-2 py-3 text-right">Amount</th>
                <th className="px-2 py-3 pr-[18px] text-right" />
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => {
                const isCovering = t.type === "covering";
                const meta = txTypeMeta(t.type);
                const cc = isCovering ? "#f59e0b" : categoryColor(t.category);
                const label = t.name || (isCovering ? `Covered for ${t.covered_for ?? "—"}` : t.category);
                const wallet = t.type === "income" ? accountName(t.to_account_id) : accountName(t.from_account_id);
                return (
                  <tr key={t.id} className="group" style={{ borderBottom: "1px solid var(--hair)" }}>
                    <td className="num whitespace-nowrap px-2 py-[11px] pl-[18px] text-[11.5px]" style={{ color: "var(--muted)" }}>{dateLabel(t.transaction_date)}</td>
                    <td className="px-2 py-[11px]">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-[30px] w-[30px] flex-[0_0_30px] items-center justify-center rounded-lg text-[12px] font-bold" style={{ background: isCovering ? "#f59e0b22" : meta.up ? "var(--accentSoft)" : meta.move ? "var(--soft)" : `${cc}22`, color: isCovering ? "#f59e0b" : meta.up ? "var(--up)" : meta.move ? "var(--muted)" : cc }}>
                          {isCovering ? "↗" : label.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <span className="text-[13px] font-semibold">{label}</span>
                          {isCovering && t.covered_for && (
                            <p className="text-[10.5px]" style={{ color: "var(--muted)" }}>for {t.covered_for}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-[11px]">
                      {isCovering ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full px-[9px] py-[3px] text-[11px] font-semibold" style={{ background: "#f59e0b22", color: "#f59e0b" }}>
                          {t.is_settled ? "✓ Settled" : "Pending"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full px-[9px] py-[3px] text-[11px] font-semibold" style={{ background: `${cc}1f`, color: cc }}>{t.category}</span>
                      )}
                    </td>
                    <td className="px-2 py-[11px] text-[12px]">
                      {isCovering ? (
                        <span className="font-semibold" style={{ color: "#f59e0b" }}>Cover Bill</span>
                      ) : (
                        <span className="font-semibold" style={{ color: meta.up ? "var(--up)" : meta.move ? "var(--muted)" : "var(--down)" }}>{meta.label}</span>
                      )}
                    </td>
                    <td className="px-2 py-[11px] text-[12.5px]" style={{ color: "var(--muted)" }}>{wallet}</td>
                    <td className="px-2 py-[11px] text-center">
                      {isCovering && !t.is_settled ? (
                        <SettleButton id={t.id} />
                      ) : (
                        <span className="rounded-[6px] px-2 py-[3px] text-[10.5px] font-semibold" style={{ background: "var(--soft)", color: "var(--muted)" }}>{methodOf(t.notes)}</span>
                      )}
                    </td>
                    <td className="num px-2 py-[11px] text-right text-[11.5px]" style={{ color: "var(--faint)" }}>{Number(t.fee ?? 0) > 0 ? formatIDR(t.fee).replace("Rp", "").trim() : "—"}</td>
                    <td className="num px-2 py-[11px] text-right text-[13px] font-semibold" style={{ color: isCovering ? "#f59e0b" : meta.up ? "var(--up)" : "var(--text)" }}>−{formatIDR(t.amount)}</td>
                    <td className="px-2 py-[11px] pr-[18px] text-right">
                      <div className="flex justify-end gap-1.5 opacity-0 transition group-hover:opacity-100">
                        {!isCovering && (
                          <button type="button" onClick={() => onEdit?.(t)} aria-label="Edit" className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ border: "1px solid var(--border)", color: "var(--muted)" }}>
                            <Pencil size={13} />
                          </button>
                        )}
                        <ConfirmDeleteButton compact itemName={`${label} transaction`} successMessage="Transaction deleted and balances updated." onConfirm={() => deleteTransaction(t.id)} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
