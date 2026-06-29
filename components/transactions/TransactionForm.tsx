"use client";

import { useEffect, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { upsertTransaction } from "@/lib/actions/transactions";
import { typedZodResolver } from "@/lib/form-resolver";
import { transactionSchema } from "@/lib/validations";
import { transactionCategories, type Account, type Transaction } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { z } from "zod";

type TransactionFormValues = z.infer<typeof transactionSchema>;

export function TransactionForm({
  accounts,
  transaction,
  categories,
  onSaved
}: {
  accounts: Account[];
  transaction?: Transaction | null;
  categories?: string[];
  onSaved?: () => void;
}) {
  const categoryOptions = categories && categories.length ? categories : [...transactionCategories];
  const defaultCategory = transaction?.category ?? categoryOptions[0] ?? "Other";
  const [pending, startTransition] = useTransition();

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<TransactionFormValues>({
    resolver: typedZodResolver<TransactionFormValues>(transactionSchema),
    defaultValues: {
      id: transaction?.id,
      type: transaction?.type ?? "outcome",
      name: transaction?.name ?? "",
      amount: transaction?.amount ?? 0,
      fee: transaction?.fee ?? 0,
      category: (transaction?.category as TransactionFormValues["category"]) ?? defaultCategory,
      from_account_id: transaction?.from_account_id ?? "",
      to_account_id: transaction?.to_account_id ?? "",
      transaction_date: transaction?.transaction_date ?? new Date().toISOString().slice(0, 10),
      notes: transaction?.notes ?? "",
      covered_for: (transaction as any)?.covered_for ?? ""
    }
  });

  useEffect(() => {
    reset({
      id: transaction?.id,
      type: transaction?.type ?? "outcome",
      name: transaction?.name ?? "",
      amount: transaction?.amount ?? 0,
      fee: transaction?.fee ?? 0,
      category: (transaction?.category as TransactionFormValues["category"]) ?? defaultCategory,
      from_account_id: transaction?.from_account_id ?? "",
      to_account_id: transaction?.to_account_id ?? "",
      transaction_date: transaction?.transaction_date ?? new Date().toISOString().slice(0, 10),
      notes: transaction?.notes ?? "",
      covered_for: (transaction as any)?.covered_for ?? ""
    });
  }, [transaction, reset]);

  const type = useWatch({ control, name: "type" });

  const isCovering = type === "covering";
  const feeLabel =
    type === "income" ? "Fee (deducted from deposit)"
    : type === "transfer" ? "Transfer Fee"
    : "Fee";

  function onSubmit(values: TransactionFormValues) {
    startTransition(async () => {
      try {
        await upsertTransaction(values);
        reset({
          type: "outcome",
          name: "",
          amount: 0,
          fee: 0,
          category: categoryOptions[0] ?? "Other",
          from_account_id: "",
          to_account_id: "",
          transaction_date: new Date().toISOString().slice(0, 10),
          notes: "",
          covered_for: ""
        });
        onSaved?.();
        toast.success(transaction ? "Transaction updated." : "Transaction added.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to save transaction.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
      {/* Type segmented control */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</p>
        <div className="grid grid-cols-4 gap-1 rounded-xl bg-muted p-1">
          {(["outcome", "income", "transfer", "covering"] as const).map((t) => (
            <label
              key={t}
              className={cn(
                "flex cursor-pointer items-center justify-center rounded-lg py-2 text-xs font-semibold transition",
                type === t
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <input type="radio" {...register("type")} value={t} className="sr-only" />
              {t === "outcome" ? "Expense" : t === "income" ? "Income" : t === "transfer" ? "Move" : "Cover Bill"}
            </label>
          ))}
        </div>
        {isCovering && (
          <p className="mt-2 text-[11px]" style={{ color: "var(--muted)" }}>
            Money leaves your wallet but is tracked as a receivable — not counted as an expense. Mark settled when they pay back.
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium">
          {isCovering ? "What for (merchant / description)" : "Name / Merchant"}
          <Input placeholder={isCovering ? "e.g. Dinner at Sushi Tei" : "e.g. Grab, Indomaret…"} {...register("name")} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Amount (Rp)
          <Input type="number" min="0" step="any" inputMode="decimal" className="num" {...register("amount")} />
          {errors.amount && <span className="text-xs text-danger">{errors.amount.message}</span>}
        </label>
      </div>

      {isCovering && (
        <label className="grid gap-1 text-sm font-medium">
          Covered for (who)
          <Input placeholder="e.g. Budi, Family trip, Office team" {...register("covered_for")} />
          {errors.covered_for && <span className="text-xs text-danger">{errors.covered_for.message}</span>}
        </label>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {type !== "transfer" && !isCovering && (
          <label className="grid gap-1 text-sm font-medium">
            Category
            <Select {...register("category")}>
              {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </label>
        )}
        <label className="grid gap-1 text-sm font-medium">
          {feeLabel}
          <Input type="number" min="0" step="any" inputMode="decimal" className="num" {...register("fee")} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Date
          <Input type="date" {...register("transaction_date")} />
          {errors.transaction_date && <span className="text-xs text-danger">{errors.transaction_date.message}</span>}
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium">
          {isCovering ? "Paid from wallet" : "From Wallet"}
          <Select {...register("from_account_id")} disabled={type === "income"}>
            <option value="">Select wallet</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
          {errors.from_account_id && <span className="text-xs text-danger">{errors.from_account_id.message}</span>}
        </label>
        {!isCovering && (
          <label className="grid gap-1 text-sm font-medium">
            To Wallet
            <Select {...register("to_account_id")} disabled={type === "outcome"}>
              <option value="">Select wallet</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
            {errors.to_account_id && <span className="text-xs text-danger">{errors.to_account_id.message}</span>}
          </label>
        )}
      </div>

      <label className="grid gap-1 text-sm font-medium">
        Notes
        <Textarea placeholder="Optional notes" {...register("notes")} />
      </label>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending || accounts.length === 0}>
          <Save size={16} />
          {pending ? "Saving…" : transaction ? "Save Changes" : "Add Transaction"}
        </Button>
      </div>
    </form>
  );
}
