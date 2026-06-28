"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { ConfirmDeleteButton } from "@/components/ui/ConfirmDeleteButton";
import { Modal } from "@/components/ui/Modal";
import { Select, Input } from "@/components/ui/Input";
import { upsertBudget, deleteBudget } from "@/lib/actions/budgets";
import { calculateBudgetUsage, type BudgetUsage } from "@/lib/calculations";
import { formatIDR, formatPercent } from "@/lib/formatters";
import { typedZodResolver } from "@/lib/form-resolver";
import { budgetSchema } from "@/lib/validations";
import { transactionCategories, type Budget, type Transaction } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { z } from "zod";

type BudgetValues = z.infer<typeof budgetSchema>;

function statusTag(level: BudgetUsage["level"]) {
  const map = {
    exceeded: { label: "Over budget", cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
    warning: { label: "Tight", cls: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" },
    watch: { label: "Watch", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
    safe: { label: "On track", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" }
  };
  const { label, cls } = map[level];
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold", cls)}>
      {label}
    </span>
  );
}

function progressColor(level: BudgetUsage["level"]) {
  if (level === "exceeded") return "bg-red-500";
  if (level === "warning") return "bg-orange-500";
  if (level === "watch") return "bg-amber-400";
  return "bg-primary";
}

export function BudgetManager({
  budgets,
  transactions,
  categories
}: {
  budgets: Budget[];
  transactions: Transaction[];
  categories?: string[];
}) {
  const categoryOptions = categories && categories.length ? categories : [...transactionCategories];
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Budget | null>(null);
  const [open, setOpen] = useState(false);
  const usage = calculateBudgetUsage(budgets, transactions);

  const { register, handleSubmit, reset } = useForm<BudgetValues>({
    resolver: typedZodResolver<BudgetValues>(budgetSchema),
    defaultValues: { category: categoryOptions[0] ?? "Other", monthly_limit: 0, period_start: "", period_end: "" }
  });

  function startAdd() {
    setEditing(null);
    reset({ category: categoryOptions[0] ?? "Other", monthly_limit: 0, period_start: "", period_end: "" });
    setOpen(true);
  }

  function editBudget(budget: Budget) {
    setEditing(budget);
    reset({
      id: budget.id,
      category: budget.category as BudgetValues["category"],
      monthly_limit: budget.monthly_limit,
      period_start: budget.period_start ?? "",
      period_end: budget.period_end ?? ""
    });
    setOpen(true);
  }

  function onSubmit(values: BudgetValues) {
    startTransition(async () => {
      try {
        await upsertBudget(values);
        setOpen(false);
        setEditing(null);
        reset({ category: categoryOptions[0] ?? "Other", monthly_limit: 0, period_start: "", period_end: "" });
        toast.success(editing ? "Budget updated." : "Budget added.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to save budget.");
      }
    });
  }

  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <Button type="button" onClick={startAdd}>
          <Plus size={15} /> Add Budget
        </Button>
      </div>

      <Modal
        open={open}
        title={editing ? "Edit Budget" : "Create Budget"}
        onClose={() => { setOpen(false); setEditing(null); }}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <label className="grid gap-1 text-sm font-medium">
            Category
            <Select {...register("category")}>
              {categoryOptions.map((c) => <option key={c}>{c}</option>)}
            </Select>
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Monthly Limit (Rp)
            <Input type="number" min="0" step="any" inputMode="decimal" className="num" {...register("monthly_limit")} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium">
              From date <span className="font-normal text-muted-foreground">(optional)</span>
              <Input type="date" {...register("period_start")} />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              To date <span className="font-normal text-muted-foreground">(optional)</span>
              <Input type="date" {...register("period_end")} />
            </label>
          </div>
          <p className="text-xs text-muted-foreground">Leave both dates empty to track the current month automatically.</p>
          <div className="flex justify-end">
            <Button disabled={pending}>{pending ? "Saving…" : editing ? "Save Budget" : "Add Budget"}</Button>
          </div>
        </form>
      </Modal>

      {usage.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Create monthly category limits to see current spending and warnings.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {usage.map((item: BudgetUsage) => (
            <div key={item.budget.id} className="rounded-2xl border border-border bg-card p-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{item.budget.category}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.budget.period_start && item.budget.period_end
                      ? `${item.budget.period_start} → ${item.budget.period_end}`
                      : "This month"}
                  </p>
                </div>
                {statusTag(item.level)}
              </div>

              {/* Progress bar */}
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-2 rounded-full transition-all", progressColor(item.level))}
                  style={{ width: `${Math.min(item.percentUsed, 100)}%` }}
                />
              </div>

              {/* Stats */}
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  <span className="num font-semibold text-foreground">{formatIDR(item.spent)}</span>
                  {" "}of {formatIDR(item.budget.monthly_limit)}
                </span>
                <span className={cn(
                  "num font-bold",
                  item.level === "exceeded" ? "text-red-600" : item.level === "warning" ? "text-orange-600" : "text-muted-foreground"
                )}>
                  {formatPercent(item.percentUsed)}
                </span>
              </div>

              {/* Remaining */}
              <p className="mt-1 text-xs text-muted-foreground">
                {item.remaining > 0
                  ? <><span className="num font-medium text-emerald-600">{formatIDR(item.remaining)}</span> remaining</>
                  : <span className="font-medium text-red-600">Over by {formatIDR(item.spent - item.budget.monthly_limit)}</span>
                }
              </p>

              {/* Actions */}
              <div className="mt-4 flex gap-2 border-t border-border pt-3">
                <Button variant="secondary" className="h-8 px-2.5 text-xs" onClick={() => editBudget(item.budget)}>
                  <Pencil size={13} /> Edit
                </Button>
                <ConfirmDeleteButton
                  compact
                  itemName={`${item.budget.category} budget`}
                  successMessage="Budget deleted."
                  onConfirm={() => deleteBudget(item.budget.id)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
