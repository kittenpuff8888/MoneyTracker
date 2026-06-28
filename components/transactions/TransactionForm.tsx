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
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors }
  } = useForm<TransactionFormValues>({
    resolver: typedZodResolver<TransactionFormValues>(transactionSchema),
    defaultValues: {
      id: transaction?.id,
      type: transaction?.type ?? "outcome",
      amount: transaction?.amount ?? 0,
      fee: transaction?.fee ?? 0,
      category: (transaction?.category as TransactionFormValues["category"]) ?? defaultCategory,
      from_account_id: transaction?.from_account_id ?? "",
      to_account_id: transaction?.to_account_id ?? "",
      transaction_date: transaction?.transaction_date ?? new Date().toISOString().slice(0, 10),
      notes: transaction?.notes ?? ""
    }
  });

  useEffect(() => {
    reset({
      id: transaction?.id,
      type: transaction?.type ?? "outcome",
      amount: transaction?.amount ?? 0,
      fee: transaction?.fee ?? 0,
      category: (transaction?.category as TransactionFormValues["category"]) ?? defaultCategory,
      from_account_id: transaction?.from_account_id ?? "",
      to_account_id: transaction?.to_account_id ?? "",
      transaction_date: transaction?.transaction_date ?? new Date().toISOString().slice(0, 10),
      notes: transaction?.notes ?? ""
    });
  }, [transaction, reset]);

  const type = useWatch({ control, name: "type" });

  function onSubmit(values: TransactionFormValues) {
    startTransition(async () => {
      try {
        await upsertTransaction(values);
        reset({
          type: "outcome",
          amount: 0,
          fee: 0,
          category: categoryOptions[0] ?? "Other",
          from_account_id: "",
          to_account_id: "",
          transaction_date: new Date().toISOString().slice(0, 10),
          notes: ""
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
      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-1 text-sm font-medium">
          Type
          <Select {...register("type")}>
            <option value="income">Income</option>
            <option value="outcome">Outcome</option>
            <option value="transfer">Transfer / Move Money</option>
          </Select>
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Amount
          <Input type="number" min="0" step="any" inputMode="decimal" {...register("amount")} />
          {errors.amount && <span className="text-xs text-red-600">{errors.amount.message}</span>}
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Category
          <Select {...register("category")}>
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Select>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-1 text-sm font-medium">
          {type === "income" ? "Fee (deducted from deposit)" : type === "transfer" ? "Transfer Fee" : "Fee"}
          <Input type="number" min="0" step="any" inputMode="decimal" {...register("fee")} />
          {errors.fee && <span className="text-xs text-red-600">{errors.fee.message}</span>}
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-1 text-sm font-medium">
          From Account
          <Select {...register("from_account_id")} disabled={type === "income"}>
            <option value="">Select account</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </Select>
          {errors.from_account_id && <span className="text-xs text-red-600">{errors.from_account_id.message}</span>}
        </label>
        <label className="grid gap-1 text-sm font-medium">
          To Account
          <Select {...register("to_account_id")} disabled={type === "outcome"}>
            <option value="">Select account</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </Select>
          {errors.to_account_id && <span className="text-xs text-red-600">{errors.to_account_id.message}</span>}
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Date
          <Input type="date" {...register("transaction_date")} />
          {errors.transaction_date && <span className="text-xs text-red-600">{errors.transaction_date.message}</span>}
        </label>
      </div>

      <label className="grid gap-1 text-sm font-medium">
        Notes
        <Textarea placeholder="Optional notes" {...register("notes")} />
      </label>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending || accounts.length === 0}>
          <Save size={16} />
          {pending ? "Saving..." : transaction ? "Save Changes" : "Add Transaction"}
        </Button>
      </div>
    </form>
  );
}
