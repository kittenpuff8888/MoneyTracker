"use client";

import { ArrowDownLeft, ArrowUpRight, Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { ConfirmDeleteButton } from "@/components/ui/ConfirmDeleteButton";
import { deleteAccount } from "@/lib/actions/accounts";
import { formatIDR } from "@/lib/formatters";
import { getWalletIcon } from "@/lib/wallet-icons";
import type { Account } from "@/lib/types";

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
  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-lg text-white"
              style={{ backgroundColor: account.color ?? "#38bdf8" }}
            >
              <Icon size={20} />
            </div>
            <div>
              <p className="font-semibold">{account.name}</p>
              <p className="text-sm text-muted-foreground">{account.type}</p>
            </div>
          </div>
          <p className="text-right text-lg font-bold">{formatIDR(account.current_balance)}</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-3 text-sm">
          <div className="flex items-center gap-2 text-emerald-600">
            <ArrowDownLeft size={15} />
            <span className="font-medium">{formatIDR(income)}</span>
          </div>
          <div className="flex items-center justify-end gap-2 text-rose-600">
            <ArrowUpRight size={15} />
            <span className="font-medium">{formatIDR(expense)}</span>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <Button variant="secondary" className="h-8 px-3" onClick={() => onEdit?.(account)}>
            <Pencil size={14} />
            Edit
          </Button>
          <ConfirmDeleteButton
            itemName={account.name}
            successMessage="Wallet deleted."
            warningText="The wallet can only be deleted when no transactions reference it."
            onConfirm={() => deleteAccount(account.id)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
