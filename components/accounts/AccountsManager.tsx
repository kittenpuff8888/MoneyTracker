"use client";

import { useState } from "react";
import { AccountCard } from "@/components/accounts/AccountCard";
import { AccountForm } from "@/components/accounts/AccountForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatIDR } from "@/lib/formatters";
import { calculateNetBalance } from "@/lib/calculations";
import type { Account, Transaction } from "@/lib/types";

export function AccountsManager({ accounts, transactions }: { accounts: Account[]; transactions: Transaction[] }) {
  const [editing, setEditing] = useState<Account | null>(null);
  const transfers = transactions.filter((transaction) => transaction.type === "transfer").slice(0, 5);

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-[1fr_280px]">
        <Card>
          <CardHeader>
            <CardTitle>{editing ? "Edit Account" : "Create Account"}</CardTitle>
          </CardHeader>
          <CardContent>
            <AccountForm account={editing} onSaved={() => setEditing(null)} />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Total Balance</p>
            <p className="mt-3 text-3xl font-bold">{formatIDR(calculateNetBalance(accounts))}</p>
            <p className="mt-2 text-sm text-muted-foreground">Across {accounts.length} accounts</p>
          </CardContent>
        </Card>
      </div>

      {accounts.length === 0 ? (
        <EmptyState title="No accounts yet." description="Create your first wallet, bank account, or e-wallet." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {accounts.map((account) => (
            <AccountCard key={account.id} account={account} onEdit={setEditing} />
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent Transfers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {transfers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent transfers yet.</p>
          ) : (
            transfers.map((transfer) => (
              <div key={transfer.id} className="flex items-center justify-between rounded-lg bg-sky-50 px-3 py-2 text-sm">
                <span>{transfer.category}</span>
                <span className="font-semibold">{formatIDR(transfer.amount)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
