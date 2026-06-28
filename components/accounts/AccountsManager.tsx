"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { AccountCard } from "@/components/accounts/AccountCard";
import { AccountForm } from "@/components/accounts/AccountForm";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatIDR } from "@/lib/formatters";
import { calculateNetBalance, calculateWalletRollup } from "@/lib/calculations";
import type { Account, Transaction } from "@/lib/types";

const TYPE_ORDER = ["Bank", "Cash", "E-wallet", "E-Money", "Investment", "Savings", "Other"];

export function AccountsManager({
  accounts,
  transactions
}: {
  accounts: Account[];
  transactions: Transaction[];
}) {
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

  const totalBalance = calculateNetBalance(accounts);

  return (
    <div className="grid gap-5">
      {/* Black summary bar */}
      <div className="flex items-center justify-between rounded-2xl bg-foreground px-6 py-5 text-card">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest opacity-60">Total Balance</p>
          <p className="num-balance num mt-1 text-3xl font-bold">{formatIDR(totalBalance)}</p>
          <p className="mt-1 text-xs opacity-60">
            {accounts.length} wallet{accounts.length === 1 ? "" : "s"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/20"
        >
          <Plus size={16} />
          Add Wallet
        </button>
      </div>

      <Modal
        open={showForm}
        title={editing ? "Edit Wallet" : "Add Wallet"}
        onClose={() => { setShowForm(false); setEditing(null); }}
      >
        <AccountForm
          account={editing}
          onSaved={() => { setEditing(null); setShowForm(false); }}
        />
      </Modal>

      {accounts.length === 0 ? (
        <EmptyState title="No wallets yet." description="Add your first wallet, bank account, or e-wallet." />
      ) : (
        <div className="space-y-6">
          {grouped.map(([type, list]) => {
            const typeTotal = list.reduce((sum, a) => sum + Number(a.current_balance ?? 0), 0);
            return (
              <section key={type}>
                {/* Type divider */}
                <div className="mb-3 flex items-center gap-3">
                  <span className="eyebrow">{type}</span>
                  <span className="num text-xs text-muted-foreground">{formatIDR(typeTotal)}</span>
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
                        onEdit={(a) => { setEditing(a); setShowForm(true); }}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
