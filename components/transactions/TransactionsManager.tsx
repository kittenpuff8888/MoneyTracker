"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { TransactionTable } from "@/components/transactions/TransactionTable";
import type { Account, Transaction } from "@/lib/types";

export function TransactionsManager({ accounts, transactions }: { accounts: Account[]; transactions: Transaction[] }) {
  const [editing, setEditing] = useState<Transaction | null>(null);

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{editing ? "Edit Transaction" : "Add Income, Outcome, or Transfer"}</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionForm accounts={accounts} transaction={editing} onSaved={() => setEditing(null)} />
        </CardContent>
      </Card>

      {transactions.length === 0 ? (
        <EmptyState title="No transactions yet." description="Start by adding income, outcome, or transfer." />
      ) : (
        <TransactionTable transactions={transactions} accounts={accounts} onEdit={setEditing} />
      )}
    </div>
  );
}
