"use client";

import { Pencil, Wallet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { ConfirmDeleteButton } from "@/components/ui/ConfirmDeleteButton";
import { deleteAccount } from "@/lib/actions/accounts";
import { formatIDR } from "@/lib/formatters";
import type { Account } from "@/lib/types";

export function AccountCard({ account, onEdit }: { account: Account; onEdit?: (account: Account) => void }) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg text-white" style={{ backgroundColor: account.color ?? "#38bdf8" }}>
              <Wallet size={20} />
            </div>
            <div>
              <p className="font-semibold">{account.name}</p>
              <p className="text-sm text-muted-foreground">{account.type}</p>
            </div>
          </div>
          <p className="text-right text-lg font-bold">{formatIDR(account.current_balance)}</p>
        </div>
        <div className="mt-5 flex gap-2">
          <Button variant="secondary" className="h-8 px-3" onClick={() => onEdit?.(account)}>
            <Pencil size={14} />
            Edit
          </Button>
          <ConfirmDeleteButton
            itemName={account.name}
            successMessage="Account deleted."
            warningText="The account can only be deleted when no transactions or subscriptions reference it."
            onConfirm={() => deleteAccount(account.id)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
