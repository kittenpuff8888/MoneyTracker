"use client";

import { Pencil } from "lucide-react";
import { ConfirmDeleteButton } from "@/components/ui/ConfirmDeleteButton";
import { deleteAccount } from "@/lib/actions/accounts";
import { getWalletIcon } from "@/lib/wallet-icons";
import type { Account } from "@/lib/types";

function compact(n: number) {
  const a = Math.abs(n);
  const s = a >= 1e9 ? `${(a / 1e9).toFixed(1)} M` : a >= 1e6 ? `${(a / 1e6).toFixed(1)} jt` : a >= 1e3 ? `${Math.round(a / 1e3)} rb` : `${Math.round(a)}`;
  return `Rp ${s}`;
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
  const color = account.color ?? "var(--accent)";

  return (
    <div className="group relative p-[15px]" style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--r)", boxShadow: "var(--sh)" }}>
      <div className="mb-3.5 flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px]" style={{ background: `${color}22`, color }}>
            <Icon size={18} />
          </div>
          <div className="leading-[1.25]">
            <div className="text-[13.5px] font-bold">{account.name}</div>
            <div className="text-[10.5px]" style={{ color: "var(--faint)" }}>{account.type}</div>
          </div>
        </div>
      </div>

      {account.card_info && (
        <div className="mb-2.5 truncate text-[11px] tracking-[.06em]" style={{ color: "var(--muted)" }}>{account.card_info}</div>
      )}

      <div className="mb-3">
        <div className="mb-[3px] text-[9.5px]" style={{ color: "var(--faint)" }}>BALANCE</div>
        <div className="num-balance num text-[21px] font-semibold leading-none">{compact(balance)}</div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 rounded-lg px-[9px] py-[7px]" style={{ background: "var(--soft)" }}>
          <div className="mb-0.5 text-[9px]" style={{ color: "var(--faint)" }}>INCOME</div>
          <div className="num text-[11.5px] font-semibold" style={{ color: "var(--up)" }}>{compact(income)}</div>
        </div>
        <div className="flex-1 rounded-lg px-[9px] py-[7px]" style={{ background: "var(--soft)" }}>
          <div className="mb-0.5 text-[9px]" style={{ color: "var(--faint)" }}>EXPENSE</div>
          <div className="num text-[11.5px] font-semibold" style={{ color: "var(--down)" }}>{compact(expense)}</div>
        </div>
      </div>

      {/* Hover actions */}
      <div className="mt-3 flex justify-end gap-1.5 opacity-0 transition group-hover:opacity-100">
        <button type="button" onClick={() => onEdit?.(account)} aria-label="Edit" className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ border: "1px solid var(--border)", color: "var(--muted)" }}>
          <Pencil size={13} />
        </button>
        <ConfirmDeleteButton compact itemName={account.name} successMessage="Wallet deleted." warningText="The wallet can only be deleted when no transactions reference it." onConfirm={() => deleteAccount(account.id)} />
      </div>
    </div>
  );
}
