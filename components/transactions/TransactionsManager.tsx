"use client";

import { useMemo, useState } from "react";
import { useAddTransaction } from "@/components/transactions/AddTransactionModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { TransactionTable } from "@/components/transactions/TransactionTable";
import { formatIDR } from "@/lib/formatters";
import { toNumber } from "@/lib/calculations";
import type { Account, Transaction } from "@/lib/types";

type TypeFilter = "all" | "income" | "outcome" | "transfer";

export function TransactionsManager({
  accounts,
  transactions
}: {
  accounts: Account[];
  transactions: Transaction[];
  categories?: string[];
}) {
  const { open, edit } = useAddTransaction();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [catFilter, setCatFilter] = useState("");
  const [walletFilter, setWalletFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const allCats = useMemo(
    () => Array.from(new Set(transactions.map((t) => t.category))).sort(),
    [transactions]
  );

  const filtered = useMemo(() => {
    let list = transactions;
    if (typeFilter !== "all") list = list.filter((t) => t.type === typeFilter);
    if (catFilter) list = list.filter((t) => t.category === catFilter);
    if (walletFilter) list = list.filter((t) => t.from_account_id === walletFilter || t.to_account_id === walletFilter);
    if (dateFrom) list = list.filter((t) => t.transaction_date >= dateFrom);
    if (dateTo) list = list.filter((t) => t.transaction_date <= dateTo);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((t) => (t.name ?? "").toLowerCase().includes(q) || t.category.toLowerCase().includes(q));
    }
    return list;
  }, [transactions, typeFilter, catFilter, walletFilter, dateFrom, dateTo, search]);

  const net = useMemo(
    () => filtered.reduce((a, t) => a + (t.type === "income" ? toNumber(t.amount) : t.type === "outcome" ? -toNumber(t.amount) : 0), 0),
    [filtered]
  );

  const tabs: { key: TypeFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "income", label: "In" },
    { key: "outcome", label: "Out" },
    { key: "transfer", label: "Move" }
  ];

  const selectStyle = { background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)", boxShadow: "var(--sh)" };

  return (
    <section className="mx-auto">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-bold tracking-[-.01em]">Transactions</h1>
          <p className="mt-1.5 text-[13px]" style={{ color: "var(--muted)" }}>
            <span className="num font-semibold" style={{ color: "var(--text)" }}>{filtered.length}</span> entries · net{" "}
            <span className="num font-semibold" style={{ color: net >= 0 ? "var(--up)" : "var(--down)" }}>{net >= 0 ? "+" : "−"}{formatIDR(net)}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => open()}
          className="flex items-center gap-[7px] rounded-[10px] px-[14px] py-[9px] text-[12.5px] font-semibold transition hover:opacity-90"
          style={{ background: "var(--ink)", color: "var(--panel)" }}
        >
          + Add Transaction
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-[7px] rounded-[10px] px-[11px] py-2" style={selectStyle}>
          <span className="text-[13px]" style={{ color: "var(--faint)" }}>⌕</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search merchant…"
            className="w-[130px] border-none bg-transparent text-[12.5px] outline-none"
            style={{ color: "var(--text)" }}
          />
        </div>
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="cursor-pointer rounded-[10px] px-[11px] py-[9px] text-[12.5px] outline-none" style={selectStyle}>
          <option value="">All categories</option>
          {allCats.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={walletFilter} onChange={(e) => setWalletFilter(e.target.value)} className="cursor-pointer rounded-[10px] px-[11px] py-[9px] text-[12.5px] outline-none" style={selectStyle}>
          <option value="">All wallets</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <div className="flex items-center gap-1.5 rounded-[10px] px-[10px] py-[7px]" style={selectStyle}>
          <span className="text-[11px]" style={{ color: "var(--faint)" }}>Date</span>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="num border-none bg-transparent text-[12px] outline-none" style={{ color: "var(--text)" }} />
          <span className="text-[11px]" style={{ color: "var(--faint)" }}>→</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="num border-none bg-transparent text-[12px] outline-none" style={{ color: "var(--text)" }} />
          {(dateFrom || dateTo) && (
            <button type="button" onClick={() => { setDateFrom(""); setDateTo(""); }} className="text-[12px]" style={{ color: "var(--muted)" }} aria-label="Clear date filter">✕</button>
          )}
        </div>
        <div className="flex-1" />
        <div className="flex gap-0.5 rounded-[10px] p-[3px]" style={{ background: "var(--soft)", border: "1px solid var(--border)" }}>
          {tabs.map((tab) => {
            const active = typeFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setTypeFilter(tab.key)}
                className="rounded-lg px-[13px] py-1.5 text-[12px] font-semibold transition"
                style={{ background: active ? "var(--ink)" : "transparent", color: active ? "var(--panel)" : "var(--muted)" }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        transactions.length === 0 ? (
          <EmptyState title="No transactions yet." description="Start by adding income, expense, or a move." />
        ) : (
          <EmptyState title="No results." description="Try adjusting your filters." />
        )
      ) : (
        <TransactionTable transactions={filtered} accounts={accounts} onEdit={(t) => edit(t)} />
      )}
    </section>
  );
}
