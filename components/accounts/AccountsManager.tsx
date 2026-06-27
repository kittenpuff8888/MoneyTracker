"use client";

import { useMemo, useState } from "react";
import { AccountCard } from "@/components/accounts/AccountCard";
import { AccountForm } from "@/components/accounts/AccountForm";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatIDR } from "@/lib/formatters";
import { calculateNetBalance, calculateWalletRollup } from "@/lib/calculations";
import { Plus } from "lucide-react";
import type { Account, Transaction } from "@/lib/types";

// Display order for the wallet type dividers.
const TYPE_ORDER = ["Bank", "Cash", "E-wallet", "E-Money", "Investment", "Savings", "Other"];

export function AccountsManager({ accounts, transactions }: { accounts: Account[]; transactions: Transaction[] }) {
  const [editing, setEditing] = useState<Account | null>(null);
  const [showForm, setShowForm] = useState(false);

  const rollups = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    for (const account of accounts) {
      map.set(account.id, calculateWalletRollup(account.id, transactions));
    }
    return map;
  }, [accounts, transactions]);

  const grouped = useMemo(() => {
    const byType = new Map<string, Account[]>();
    for (const account of accounts) {
      const key = (account.type as string) || "Other";
      if (!byType.has(key)) byType.set(key, []);
      byType.get(key)!.push(account);
    }
    return Array.from(byType.entries()).sort(
      (a, b) => TYPE_ORDER.indexOf(a[0]) - TYPE_ORDER.indexOf(b[0])
    );
  }, [accounts]);

  function startEdit(account: Account) {
    setEditing(account);
    setShowForm(true);
  }

  function startCreate() {
    setEditing(null);
    setShowForm(true);
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-[1fr_280px]">
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Total Balance</p>
            <p className="mt-3 text-3xl font-bold">{formatIDR(calculateNetBalance(accounts))}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Across {accounts.length} wallet{accounts.length === 1 ? "" : "s"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex h-full flex-col justify-center">
            <Button onClick={startCreate}>
              <Plus size={16} />
              Add Wallet
            </Button>
          </CardContent>
        </Card>
      </div>

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>{editing ? "Edit Wallet" : "Add Wallet"}</CardTitle>
          </CardHeader>
          <CardContent>
            <AccountForm
              account={editing}
              onSaved={() => {
                setEditing(null);
                setShowForm(false);
              }}
            />
          </CardContent>
        </Card>
      ) : null}

      {accounts.length === 0 ? (
        <EmptyState title="No wallets yet." description="Add your first wallet, bank account, or e-wallet." />
      ) : (
        <div className="space-y-6">
          {grouped.map(([type, list]) => (
            <section key={type} className="space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{type}</h2>
                <span className="text-xs text-muted-foreground">
                  {formatIDR(list.reduce((sum, a) => sum + Number(a.current_balance ?? 0), 0))}
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {list.map((account) => {
                  const rollup = rollups.get(account.id) ?? { income: 0, expense: 0 };
                  return (
                    <AccountCard
                      key={account.id}
                      account={account}
                      income={rollup.income}
                      expense={rollup.expense}
                      onEdit={startEdit}
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
