"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { ConfirmDeleteButton } from "@/components/ui/ConfirmDeleteButton";
import { Modal } from "@/components/ui/Modal";
import { Select, Input } from "@/components/ui/Input";
import { upsertBudget, deleteBudget } from "@/lib/actions/budgets";
import { calculateBudgetUsage, type BudgetUsage } from "@/lib/calculations";
import { formatIDR, formatPercent } from "@/lib/formatters";
import { typedZodResolver } from "@/lib/form-resolver";
import { budgetSchema } from "@/lib/validations";
import { transactionCategories, type Budget, type Transaction } from "@/lib/types";
import type { z } from "zod";

type BudgetValues = z.infer<typeof budgetSchema>;

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
    reset({ id: budget.id, category: budget.category as BudgetValues["category"], monthly_limit: budget.monthly_limit, period_start: budget.period_start ?? "", period_end: budget.period_end ?? "" });
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
    <div className="grid gap-6">
      <div className="flex justify-end">
        <Button type="button" onClick={startAdd}>
          <Plus size={16} />
          Add Budget
        </Button>
      </div>

      <Modal open={open} title={editing ? "Edit Monthly Budget" : "Create Monthly Budget"} onClose={() => { setOpen(false); setEditing(null); }}>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <label className="grid gap-1 text-sm font-medium">
            Category
            <Select {...register("category")}>{categoryOptions.map((category) => <option key={category}>{category}</option>)}</Select>
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Limit
            <Input type="number" min="0" step="any" inputMode="decimal" {...register("monthly_limit")} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium">
              From date
              <Input type="date" {...register("period_start")} />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              To date
              <Input type="date" {...register("period_end")} />
            </label>
          </div>
          <p className="text-xs text-muted-foreground">Leave both dates empty to track the current month automatically.</p>
          <div className="flex justify-end"><Button disabled={pending}>{pending ? "Saving..." : editing ? "Save Budget" : "Add Budget"}</Button></div>
        </form>
      </Modal>

      <div className="grid gap-4">
        {usage.length === 0 ? <Card><CardContent><p className="text-sm text-muted-foreground">Create monthly category limits to see current spending and warnings.</p></CardContent></Card> : usage.map((item: BudgetUsage) => (
          <Card key={item.budget.id}>
            <CardContent>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{item.budget.category}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.budget.period_start && item.budget.period_end
                      ? `${item.budget.period_start} \u2192 ${item.budget.period_end}`
                      : "This month"}
                  </p>
                  <p className="text-sm text-muted-foreground">{formatIDR(item.spent)} spent of {formatIDR(item.budget.monthly_limit)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={item.percentUsed >= 90 ? "text-sm font-semibold text-red-600" : item.percentUsed >= 75 ? "text-sm font-semibold text-orange-600" : "text-sm font-semibold text-emerald-600"}>{formatPercent(item.percentUsed)}</span>
                  <Button variant="secondary" className="h-8 px-3" onClick={() => editBudget(item.budget)}><Pencil size={14} />Edit</Button>
                  <ConfirmDeleteButton
                    itemName={`${item.budget.category} budget`}
                    successMessage="Budget deleted."
                    onConfirm={() => deleteBudget(item.budget.id)}
                  />
                </div>
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-sky-500" style={{ width: `${Math.min(item.percentUsed, 100)}%` }} /></div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
