"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { upsertTransaction } from "@/lib/actions/transactions";
import { typedZodResolver } from "@/lib/form-resolver";
import { transactionSchema } from "@/lib/validations";
import type { Account } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { z } from "zod";

type Values = z.infer<typeof transactionSchema>;

const today = new Date().toISOString().slice(0, 10);

function emptyValues(cat: string): Values {
  return {
    type: "outcome",
    name: "",
    amount: 0,
    fee: 0,
    category: cat,
    from_account_id: null,
    to_account_id: null,
    transaction_date: today,
    notes: ""
  };
}

export function QuickTransactionForm({ onSaved }: { onSaved?: () => void }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    fetch("/api/quick-form-data")
      .then((r) => r.json())
      .then((d) => {
        setAccounts(d.accounts ?? []);
        setCategories(d.categories ?? []);
      })
      .catch(() => {});
  }, []);

  const { register, handleSubmit, control, reset, setValue, formState: { errors } } = useForm<Values>({
    resolver: typedZodResolver<Values>(transactionSchema),
    defaultValues: emptyValues("Other")
  });

  // When categories load, update the category field (don't reset whole form)
  useEffect(() => {
    if (categories.length > 0) {
      setValue("category", categories[0]);
    }
  }, [categories, setValue]);

  const type = useWatch({ control, name: "type" });

  const feeLabel =
    type === "income" ? "Fee (deducted from deposit)"
    : type === "transfer" ? "Transfer Fee"
    : "Fee";

  function onSubmit(values: Values) {
    startTransition(async () => {
      try {
        await upsertTransaction(values);
        reset(emptyValues(categories[0] ?? "Other"));
        toast.success("Transaction added.");
        onSaved?.();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Unable to save transaction.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
      {/* Type segmented control */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</p>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
          {(["outcome", "income", "transfer"] as const).map((t) => (
            <label
              key={t}
              className={cn(
                "flex cursor-pointer items-center justify-center rounded-lg py-2 text-xs font-semibold transition",
                type === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <input type="radio" {...register("type")} value={t} className="sr-only" />
              {t === "outcome" ? "Expense" : t === "income" ? "Income" : "Move Money"}
            </label>
          ))}
        </div>
      </div>

      {/* Name / Merchant */}
      <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Name / Merchant
        <input
          {...register("name")}
          placeholder="e.g. Grab, Indomaret…"
          className="h-10 rounded-lg border border-border bg-muted px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20"
        />
      </label>

      {/* Amount */}
      <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Amount (Rp)
        <input
          type="number"
          min="0"
          step="any"
          inputMode="decimal"
          {...register("amount")}
          className="num h-10 rounded-lg border border-border bg-muted px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20"
        />
        {errors.amount && <span className="text-xs text-danger">{errors.amount.message}</span>}
      </label>

      {/* Category — hidden for transfer */}
      {type !== "transfer" && (
        <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Category
          <select
            {...register("category")}
            className="h-10 rounded-lg border border-border bg-muted px-3 text-sm text-foreground outline-none focus:border-primary"
          >
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      )}

      {/* From / To wallets */}
      <div className={cn("grid gap-3", type === "transfer" ? "grid-cols-2" : "grid-cols-1")}>
        {type !== "income" && (
          <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            From Wallet
            <select
              {...register("from_account_id")}
              className="h-10 rounded-lg border border-border bg-muted px-3 text-sm text-foreground outline-none focus:border-primary"
            >
              <option value="">Select</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            {errors.from_account_id && <span className="text-xs text-danger">{errors.from_account_id.message}</span>}
          </label>
        )}
        {type !== "outcome" && (
          <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            To Wallet
            <select
              {...register("to_account_id")}
              className="h-10 rounded-lg border border-border bg-muted px-3 text-sm text-foreground outline-none focus:border-primary"
            >
              <option value="">Select</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            {errors.to_account_id && <span className="text-xs text-danger">{errors.to_account_id.message}</span>}
          </label>
        )}
      </div>

      {/* Fee */}
      <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {feeLabel}
        <input
          type="number"
          min="0"
          step="any"
          inputMode="decimal"
          {...register("fee")}
          className="num h-10 rounded-lg border border-border bg-muted px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20"
        />
      </label>

      {/* Date */}
      <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Date
        <input
          type="date"
          {...register("transaction_date")}
          className="num h-10 rounded-lg border border-border bg-muted px-3 text-sm text-foreground outline-none focus:border-primary"
        />
      </label>

      {/* Notes */}
      <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Notes (optional)
        <textarea
          {...register("notes")}
          placeholder="Add a note…"
          rows={2}
          className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
      </label>

      <button
        type="submit"
        disabled={pending || accounts.length === 0}
        className="mt-1 h-11 w-full rounded-xl bg-foreground text-sm font-semibold text-card transition hover:opacity-90 disabled:opacity-50"
      >
        {accounts.length === 0
          ? "Add a wallet first"
          : pending
          ? "Saving…"
          : "Add Transaction"}
      </button>
    </form>
  );
}
