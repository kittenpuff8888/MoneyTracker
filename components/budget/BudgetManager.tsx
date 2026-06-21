"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Select, Input } from "@/components/ui/Input";
import { upsertBudget, deleteBudget } from "@/lib/actions/budgets";
import { calculateBudgetUsage, type BudgetUsage } from "@/lib/calculations";
import { formatIDR, formatPercent } from "@/lib/formatters";
import { typedZodResolver } from "@/lib/form-resolver";
import { budgetSchema } from "@/lib/validations";
import { transactionCategories, type Budget, type Transaction } from "@/lib/types";
import type { z } from "zod";

type BudgetValues = z.infer<typeof budgetSchema>;

export function BudgetManager({ budgets, transactions }: { budgets: Budget[]; transactions: Transaction[] }) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Budget | null>(null);
  const usage = calculateBudgetUsage(budgets, transactions);
  const { register, handleSubmit, reset } = useForm<BudgetValues>({
    resolver: typedZodResolver<BudgetValues>(budgetSchema),
    defaultValues: { category: "Lunch", monthly_limit: 0 }
  });

  function editBudget(budget: Budget) {
    setEditing(budget);
    reset({ id: budget.id, category: budget.category as BudgetValues["category"], monthly_limit: budget.monthly_limit });
  }

  function onSubmit(values: BudgetValues) {
    startTransition(async () => {
      await upsertBudget(values);
      setEditing(null);
      reset({ category: "Lunch", monthly_limit: 0 });
    });
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader><CardTitle>{editing ? "Edit Monthly Budget" : "Create Monthly Budget"}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
            <label className="grid gap-1 text-sm font-medium">
              Category
              <Select {...register("category")}>{transactionCategories.map((category) => <option key={category}>{category}</option>)}</Select>
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Monthly Limit
              <Input type="number" min="0" step="1000" {...register("monthly_limit")} />
            </label>
            <div className="self-end"><Button disabled={pending}>{pending ? "Saving..." : editing ? "Save Budget" : "Add Budget"}</Button></div>
          </form>
        </CardContent>
      </Card>
      <div className="grid gap-4">
        {usage.length === 0 ? <Card><CardContent><p className="text-sm text-muted-foreground">Create monthly category limits to see current spending and warnings.</p></CardContent></Card> : usage.map((item: BudgetUsage) => (
          <Card key={item.budget.id}>
            <CardContent>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{item.budget.category}</p>
                  <p className="text-sm text-muted-foreground">{formatIDR(item.spent)} spent of {formatIDR(item.budget.monthly_limit)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={item.percentUsed >= 90 ? "text-sm font-semibold text-red-600" : item.percentUsed >= 75 ? "text-sm font-semibold text-orange-600" : "text-sm font-semibold text-emerald-600"}>{formatPercent(item.percentUsed)}</span>
                  <Button variant="secondary" className="h-8 px-3" onClick={() => editBudget(item.budget)}><Pencil size={14} />Edit</Button>
                  <Button variant="danger" className="h-8 px-3" onClick={() => startTransition(async () => deleteBudget(item.budget.id))}><Trash2 size={14} />Delete</Button>
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
