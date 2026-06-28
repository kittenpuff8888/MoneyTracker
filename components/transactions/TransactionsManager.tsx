"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { TransactionTable } from "@/components/transactions/TransactionTable";
import type { Account, Transaction } from "@/lib/types";

export function TransactionsManager({
  accounts,
  transactions,
  categories
}: {
  accounts: Account[];
  transactions: Transaction[];
  categories?: string[];
}) {
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [open, setOpen] = useState(false);

  function startAdd() {
    setEditing(null);
    setOpen(true);
  }

  function startEdit(transaction: Transaction) {
    setEditing(transaction);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setEditing(null);
  }

  return (
    <div className="grid gap-6">
      <div className="flex justify-end">
        <Button type="button" onClick={startAdd}>
          <Plus size={16} />
          Add Transaction
        </Button>
      </div>

      <Modal open={open} title={editing ? "Edit Transaction" : "Add Income, Outcome, or Transfer"} onClose={close}>
        <TransactionForm accounts={accounts} transaction={editing} categories={categories} onSaved={close} />
      </Modal>

      {transactions.length === 0 ? (
        <EmptyState title="No transactions yet." description="Start by adding income, outcome, or transfer." />
      ) : (
        <div>
          {transactions.length >= 100 ? (
            <p className="mb-3 text-xs text-muted-foreground">Showing your latest 100 transactions for faster loading.</p>
          ) : null}
          <TransactionTable transactions={transactions} accounts={accounts} onEdit={startEdit} />
        </div>
      )}
    </div>
  );
}
