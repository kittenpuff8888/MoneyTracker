"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { TransactionTable } from "@/components/transactions/TransactionTable";
import type { Account, Transaction } from "@/lib/types";

export function TransactionsManager({ accounts, transactions, categories }: { accounts: Account[]; transactions: Transaction[]; categories?: string[] }) {
  const [editing, setEditing] = useState<Transaction | null>(null);

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{editing ? "Edit Transaction" : "Add Income, Outcome, or Transfer"}</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionForm accounts={accounts} transaction={editing} categories={categories} onSaved={() => setEditing(null)} />
        </CardContent>
      </Card>

      {transactions.length === 0 ? (
        <EmptyState title="No transactions yet." description="Start by adding income, outcome, or transfer." />
      ) : (
        <div>
          {transactions.length >= 100 ? (
            <p className="mb-3 text-xs text-muted-foreground">Showing your latest 100 transactions for faster loading.</p>
          ) : null}
          <TransactionTable transactions={transactions} accounts={accounts} onEdit={setEditing} />
        </div>
      )}
    </div>
  );
}
