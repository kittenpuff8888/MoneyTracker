"use client";

import { ArrowDownLeft, ArrowUpRight, Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDeleteButton } from "@/components/ui/ConfirmDeleteButton";
import { deleteAccount } from "@/lib/actions/accounts";
import { formatIDR } from "@/lib/formatters";
import { getWalletIcon } from "@/lib/wallet-icons";
import { cn } from "@/lib/utils";
import type { Account } from "@/lib/types";

/* Inline SVG sparkline — 8-point fake trend based on income/expense ratio */
function Sparkline({ income, expense }: { income: number; expense: number }) {
  const total = income + expense || 1;
  // generate a tiny 8-point path that trends based on net
  const net = income - expense;
  const points = Array.from({ length: 8 }, (_, i) => {
    const noise = (Math.sin(i * 2.3 + total * 0.0001) * 0.3 + 0.5);
    const trend = (net / total) * (i / 7);
    return Math.min(Math.max(0.5 + trend + noise * 0.2, 0.1), 0.9);
  });
  const w = 72;
  const h = 24;
  const coords = points.map((p, i) => `${(i / 7) * w},${h - p * h}`).join(" ");
  const color = net >= 0 ? "#22c55e" : "#e5484d";
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline
        points={coords}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={0.7}
      />
    </svg>
  );
}

export function AccountCard({
  account,
  income = 0,
  expense = 0,
  onEdit
}: {
  account: Account;
  income?: number;
  expense?: number;
  onEdit?: (account: Account) => void;
}) {
  const Icon = getWalletIcon(account.icon);
  const balance = Number(account.current_balance ?? 0);
  const starting = Number(account.starting_balance ?? 0);
  const pctChange = starting > 0 ? ((balance - starting) / starting) * 100 : 0;
  const pctLabel = `${pctChange >= 0 ? "+" : ""}${Math.round(pctChange)}%`;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-4 transition hover:shadow-md">
      {/* Color accent strip */}
      <div
        className="absolute left-0 top-0 h-full w-1 rounded-l-2xl"
        style={{ backgroundColor: account.color ?? "#38bdf8" }}
      />

      <div className="ml-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
              style={{ backgroundColor: account.color ?? "#38bdf8" }}
            >
              <Icon size={17} />
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold leading-tight">{account.name}</p>
              <p className="text-xs text-muted-foreground">{account.type}</p>
            </div>
          </div>
          <Sparkline income={income} expense={expense} />
        </div>

        {/* Balance */}
        <p className="num-balance num mt-3 text-xl font-bold">{formatIDR(balance)}</p>
        <p className={cn(
          "num mt-0.5 text-xs font-semibold",
          pctChange >= 0 ? "text-emerald-600" : "text-red-600"
        )}>
          {pctLabel} vs. start
        </p>

        {/* Income / Expense */}
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 text-xs">
          <div className="flex items-center gap-1.5 text-emerald-600">
            <ArrowDownLeft size={13} />
            <span className="num-balance num font-medium">{formatIDR(income)}</span>
          </div>
          <div className="flex items-center justify-end gap-1.5 text-red-600">
            <ArrowUpRight size={13} />
            <span className="num-balance num font-medium">{formatIDR(expense)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" className="h-8 px-3 text-xs" onClick={() => onEdit?.(account)}>
            <Pencil size={13} /> Edit
          </Button>
          <ConfirmDeleteButton
            itemName={account.name}
            successMessage="Wallet deleted."
            warningText="The wallet can only be deleted when no transactions reference it."
            onConfirm={() => deleteAccount(account.id)}
          />
        </div>
      </div>
    </div>
  );
}
