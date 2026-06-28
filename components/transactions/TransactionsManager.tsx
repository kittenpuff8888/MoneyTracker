"use client";

import { useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { TransactionTable } from "@/components/transactions/TransactionTable";
import { cn } from "@/lib/utils";
import type { Account, Transaction } from "@/lib/types";

type TypeFilter = "all" | "income" | "outcome" | "transfer";

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
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [catFilter, setCatFilter] = useState("");
  const [walletFilter, setWalletFilter] = useState("");

  const allCats = useMemo(() => {
    const s = new Set(transactions.map((t) => t.category));
    return Array.from(s).sort();
  }, [transactions]);

  const filtered = useMemo(() => {
    let list = transactions;
    if (typeFilter !== "all") list = list.filter((t) => t.type === typeFilter);
    if (catFilter) list = list.filter((t) => t.category === catFilter);
    if (walletFilter) list = list.filter((t) => t.from_account_id === walletFilter || t.to_account_id === walletFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((t) =>
        (t.name ?? "").toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        (t.notes ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [transactions, typeFilter, catFilter, walletFilter, search]);

  function startAdd() { setEditing(null); setOpen(true); }
  function startEdit(t: Transaction) { setEditing(t); setOpen(true); }
  function close() { setOpen(false); setEditing(null); }

  const tabs: { key: TypeFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "income", label: "In" },
    { key: "outcome", label: "Out" },
    { key: "transfer", label: "Move" }
  ];

  return (
    <div className="grid gap-4">
      {/* Filter toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
        {/* Search */}
        <div className="relative min-w-40 flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="h-9 w-full rounded-lg border border-border bg-muted pl-8 pr-8 text-sm outline-none focus:border-primary"
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Category filter */}
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="h-9 rounded-lg border border-border bg-muted px-3 text-sm text-foreground outline-none focus:border-primary"
        >
          <option value="">All categories</option>
          {allCats.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Wallet filter */}
        <select
          value={walletFilter}
          onChange={(e) => setWalletFilter(e.target.value)}
          className="h-9 rounded-lg border border-border bg-muted px-3 text-sm text-foreground outline-none focus:border-primary"
        >
          <option value="">All wallets</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>

        {/* Type tabs */}
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setTypeFilter(tab.key)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-semibold transition",
                typeFilter === tab.key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Button type="button" onClick={startAdd} className="ml-auto shrink-0">
          <Plus size={15} />
          Add
        </Button>
      </div>

      <Modal
        open={open}
        title={editing ? "Edit Transaction" : "Add Transaction"}
        onClose={close}
      >
        <TransactionForm accounts={accounts} transaction={editing} categories={categories} onSaved={close} />
      </Modal>

      {filtered.length === 0 ? (
        transactions.length === 0 ? (
          <EmptyState title="No transactions yet." description="Start by adding income, expense, or transfer." />
        ) : (
          <EmptyState title="No results." description="Try adjusting your filters." />
        )
      ) : (
        <div>
          {transactions.length >= 100 && (
            <p className="mb-2 text-xs text-muted-foreground">Showing latest 100 transactions.</p>
          )}
          <TransactionTable transactions={filtered} accounts={accounts} onEdit={startEdit} />
        </div>
      )}
    </div>
  );
}
