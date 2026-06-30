"use client";

import { useMemo, useState } from "react";
import { AccountCard } from "@/components/accounts/AccountCard";
import { AccountForm } from "@/components/accounts/AccountForm";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatIDR } from "@/lib/formatters";
import { calculateNetBalance, calculateWalletRollup } from "@/lib/calculations";
import type { Account, Transaction } from "@/lib/types";

const TYPE_ORDER = ["Bank", "Cash", "E-Wallet", "E-Money", "Investment", "Savings", "Other"];

function compact(n: number) {
  const a = Math.abs(n);
  const s = a >= 1e9 ? `${(a / 1e9).toFixed(1)} M` : a >= 1e6 ? `${(a / 1e6).toFixed(1)} jt` : a >= 1e3 ? `${Math.round(a / 1e3)} rb` : `${Math.round(a)}`;
  return `Rp ${s}`;
}

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
    for (const account of accounts) map.set(account.id, calculateWalletRollup(account.id, transactions));
    return map;
  }, [accounts, transactions]);

  const grouped = useMemo(() => {
    const byType = new Map<string, Account[]>();
    for (const account of accounts) {
      const key = (account.type as string) || "Other";
      if (!byType.has(key)) byType.set(key, []);
      byType.get(key)!.push(account);
    }
    return Array.from(byType.entries()).sort((a, b) => TYPE_ORDER.indexOf(a[0]) - TYPE_ORDER.indexOf(b[0]));
  }, [accounts]);

  const totalBalance = calculateNetBalance(accounts);
  const totalIncome = useMemo(() => Array.from(rollups.values()).reduce((a, r) => a + r.income, 0), [rollups]);
  const totalExpense = useMemo(() => Array.from(rollups.values()).reduce((a, r) => a + r.expense, 0), [rollups]);

  return (
    <section className="mx-auto max-w-[1320px]">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-bold tracking-[-.01em]">Wallet</h1>
          <p className="mt-1.5 text-[13.5px]" style={{ color: "var(--muted)" }}>
            {accounts.length} wallets across {grouped.length} types · income &amp; expenses recorded from your transactions.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-[7px] rounded-[10px] px-[14px] py-[9px] text-[12.5px] font-semibold transition hover:opacity-90"
          style={{ background: "var(--ink)", color: "var(--panel)" }}
        >
          + Add Wallet
        </button>
      </div>

      {/* Summary bar */}
      <div className="mb-[18px] flex flex-wrap items-center justify-between gap-4 px-5 py-[18px]" style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--r)", boxShadow: "var(--sh)" }}>
        <div>
          <div className="mb-[7px] text-[11px] font-semibold tracking-[.07em]" style={{ color: "var(--faint)" }}>TOTAL BALANCE · ALL WALLETS</div>
          <div className="num-balance num text-[30px] font-semibold leading-none">{formatIDR(totalBalance)}</div>
        </div>
        <div className="flex gap-[26px]">
          <div><div className="mb-1 text-[10.5px]" style={{ color: "var(--faint)" }}>INCOME</div><div className="num text-[16px] font-semibold" style={{ color: "var(--up)" }}>{compact(totalIncome)}</div></div>
          <div><div className="mb-1 text-[10.5px]" style={{ color: "var(--faint)" }}>EXPENSE</div><div className="num text-[16px] font-semibold" style={{ color: "var(--down)" }}>{compact(totalExpense)}</div></div>
          <div><div className="mb-1 text-[10.5px]" style={{ color: "var(--faint)" }}>WALLETS</div><div className="num text-[16px] font-semibold">{accounts.length}</div></div>
        </div>
      </div>

      <Modal open={showForm} title={editing ? "Edit Wallet" : "Add Wallet"} onClose={() => { setShowForm(false); setEditing(null); }}>
        <AccountForm account={editing} onSaved={() => { setEditing(null); setShowForm(false); }} />
      </Modal>

      {accounts.length === 0 ? (
        <EmptyState title="No wallets yet." description="Add your first wallet, bank account, or e-wallet." />
      ) : (
        <div className="space-y-[22px]">
          {grouped.map(([type, list]) => {
            const typeTotal = list.reduce((sum, a) => sum + Number(a.current_balance ?? 0), 0);
            return (
              <section key={type}>
                <div className="mb-[11px] flex items-center gap-2.5">
                  <span className="text-[11.5px] font-bold tracking-[.04em]">{type}</span>
                  <span className="num text-[11px]" style={{ color: "var(--muted)" }}>
                    {list.length} {list.length > 1 ? "wallets" : "wallet"} · {compact(typeTotal)}
                  </span>
                  <div className="h-px flex-1" style={{ background: "var(--border)" }} />
                </div>
                <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(266px, 1fr))" }}>
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
    </section>
  );
}
