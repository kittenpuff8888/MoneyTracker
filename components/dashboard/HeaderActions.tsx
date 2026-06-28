"use client";

import { useAddTransaction } from "@/components/transactions/AddTransactionModal";

export function DashboardHeaderActions() {
  const { open } = useAddTransaction();
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => open("outcome")}
        className="flex items-center gap-[7px] rounded-[10px] px-[14px] py-[9px] text-[12.5px] font-semibold transition hover:opacity-90"
        style={{ background: "var(--ink)", color: "var(--panel)" }}
      >
        − Add Expense
      </button>
      <button
        type="button"
        onClick={() => open("income")}
        className="flex items-center gap-[7px] rounded-[10px] px-[14px] py-[9px] text-[12.5px] font-semibold transition hover:opacity-90"
        style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)" }}
      >
        + Add Income
      </button>
    </div>
  );
}
