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
    <div className="overflow-hidden rounded-lg border border-border bg-white">
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
  );
}
