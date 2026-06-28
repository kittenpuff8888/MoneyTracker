"use client";

import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDeleteButton } from "@/components/ui/ConfirmDeleteButton";
import { deleteTransaction } from "@/lib/actions/transactions";
import { formatIDR } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { Account, Transaction } from "@/lib/types";

function TypePill({ type }: { type: Transaction["type"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        type === "income" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
        type === "outcome" && "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
        type === "transfer" && "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
      )}
    >
      {type === "transfer" ? "Move" : type === "income" ? "In" : "Out"}
    </span>
  );
}

function CategoryPill({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
      {name}
    </span>
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
        {transactions.map((t) => (
          <article key={t.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <TypePill type={t.type} />
                  <CategoryPill name={t.category} />
                </div>
                <p className="mt-1.5 truncate font-semibold">{t.name || t.category}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{t.transaction_date}</p>
              </div>
              <p className={cn(
                "num shrink-0 text-right font-bold",
                t.type === "income" ? "text-emerald-600" : t.type === "outcome" ? "text-red-600" : "text-foreground"
              )}>
                {t.type === "outcome" ? "−" : t.type === "income" ? "+" : ""}{formatIDR(t.amount)}
              </p>
            </div>
            <div className="mt-3 flex justify-end gap-2 border-t border-border pt-3">
              <Button type="button" variant="secondary" className="h-9 px-3" onClick={() => onEdit?.(t)}>
                <Pencil size={13} /> Edit
              </Button>
              <ConfirmDeleteButton
                compact
                itemName={`${t.name || t.category} transaction`}
                successMessage="Transaction deleted and balances updated."
                onConfirm={() => deleteTransaction(t.id)}
              />
            </div>
          </article>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-border bg-muted">
              <tr>
                {["Date", "Merchant", "Category", "Type", "Wallet", "Fee", "Amount", ""].map((h) => (
                  <th key={h} className="eyebrow px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {transactions.map((t) => {
                const wallet = t.type === "income"
                  ? accountName(t.to_account_id)
                  : accountName(t.from_account_id);
                const amtColor = t.type === "income"
                  ? "text-emerald-600"
                  : t.type === "outcome"
                  ? "text-red-600"
                  : "text-foreground";

                return (
                  <tr key={t.id} className="transition-colors hover:bg-muted/50">
                    <td className="num px-4 py-3 text-muted-foreground">{t.transaction_date}</td>
                    <td className="px-4 py-3 font-medium">{t.name || "—"}</td>
                    <td className="px-4 py-3"><CategoryPill name={t.category} /></td>
                    <td className="px-4 py-3"><TypePill type={t.type} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{wallet}</td>
                    <td className="num px-4 py-3 text-muted-foreground">
                      {Number(t.fee ?? 0) > 0 ? formatIDR(t.fee) : "—"}
                    </td>
                    <td className={cn("num px-4 py-3 font-semibold", amtColor)}>
                      {t.type === "outcome" ? "−" : t.type === "income" ? "+" : ""}{formatIDR(t.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <Button type="button" variant="secondary" className="h-8 px-2.5" onClick={() => onEdit?.(t)}>
                          <Pencil size={13} />
                        </Button>
                        <ConfirmDeleteButton
                          compact
                          itemName={`${t.name || t.category} transaction`}
                          successMessage="Transaction deleted and balances updated."
                          onConfirm={() => deleteTransaction(t.id)}
                        />
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
