"use client";

import { useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { deleteTransaction } from "@/lib/actions/transactions";
import { formatIDR } from "@/lib/formatters";
import type { Account, Transaction } from "@/lib/types";

export function TransactionTable({
  transactions,
  accounts,
  onEdit
}: {
  transactions: Transaction[];
  accounts: Account[];
  onEdit?: (transaction: Transaction) => void;
}) {
  const [pending, startTransition] = useTransition();
  const accountName = (id: string | null) => accounts.find((account) => account.id === id)?.name ?? "-";

  return (
    <>
      <div className="grid gap-3 md:hidden">
        {transactions.map((transaction) => (
          <article key={transaction.id} className="rounded-lg border border-border bg-white p-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Badge tone={transaction.type === "income" ? "green" : transaction.type === "outcome" ? "orange" : "sky"}>
                  {transaction.type === "transfer" ? "Transfer" : transaction.type === "income" ? "Income" : "Outcome"}
                </Badge>
                <h2 className="mt-2 truncate text-base font-semibold">{transaction.category}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{transaction.transaction_date}</p>
              </div>
              <p className="shrink-0 text-right text-base font-bold">{formatIDR(transaction.amount)}</p>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3 text-xs">
              <div>
                <dt className="text-muted-foreground">From</dt>
                <dd className="mt-1 truncate font-medium">{accountName(transaction.from_account_id)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">To</dt>
                <dd className="mt-1 truncate font-medium">{accountName(transaction.to_account_id)}</dd>
              </div>
            </dl>
            {transaction.notes ? <p className="mt-3 break-words text-sm text-muted-foreground">{transaction.notes}</p> : null}
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                aria-label={`Edit ${transaction.category} transaction`}
                className="h-11 w-11 px-0"
                onClick={() => onEdit?.(transaction)}
              >
                <Pencil size={16} />
              </Button>
              <Button
                type="button"
                variant="danger"
                aria-label={`Delete ${transaction.category} transaction`}
                className="h-11 w-11 px-0"
                disabled={pending}
                onClick={() => startTransition(async () => deleteTransaction(transaction.id))}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-border bg-white md:block">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-sky-50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">From Account</th>
              <th className="px-4 py-3">To Account</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Notes</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {transactions.map((transaction) => (
              <tr key={transaction.id}>
                <td className="px-4 py-3">
                  <Badge tone={transaction.type === "income" ? "green" : transaction.type === "outcome" ? "orange" : "sky"}>
                    {transaction.type === "transfer" ? "Transfer / Move Money" : transaction.type === "income" ? "Income" : "Outcome"}
                  </Badge>
                </td>
                <td className="px-4 py-3 font-medium">{transaction.category}</td>
                <td className="px-4 py-3 text-muted-foreground">{accountName(transaction.from_account_id)}</td>
                <td className="px-4 py-3 text-muted-foreground">{accountName(transaction.to_account_id)}</td>
                <td className="px-4 py-3">{transaction.transaction_date}</td>
                <td className="px-4 py-3 font-semibold">{formatIDR(transaction.amount)}</td>
                <td className="max-w-52 truncate px-4 py-3 text-muted-foreground">{transaction.notes ?? "-"}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button type="button" variant="secondary" className="h-8 px-3" onClick={() => onEdit?.(transaction)}>
                      <Pencil size={14} />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      className="h-8 px-3"
                      disabled={pending}
                      onClick={() => startTransition(async () => deleteTransaction(transaction.id))}
                    >
                      <Trash2 size={14} />
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </>
  );
}
