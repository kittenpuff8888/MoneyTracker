"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { ConfirmDeleteButton } from "@/components/ui/ConfirmDeleteButton";
import { Modal } from "@/components/ui/Modal";
import { Select, Input } from "@/components/ui/Input";
import { upsertBudget, deleteBudget } from "@/lib/actions/budgets";
import { calculateBudgetUsage, type BudgetUsage } from "@/lib/calculations";
import { formatIDR, formatPercent } from "@/lib/formatters";
import { categoryColor } from "@/lib/category-colors";
import { typedZodResolver } from "@/lib/form-resolver";
import { budgetSchema } from "@/lib/validations";
import { transactionCategories, type Budget, type Transaction } from "@/lib/types";
import type { z } from "zod";

type BudgetValues = z.infer<typeof budgetSchema>;

function compact(n: number) {
  const a = Math.abs(n);
  const s = a >= 1e9 ? `${(a / 1e9).toFixed(1)} M` : a >= 1e6 ? `${(a / 1e6).toFixed(1)} jt` : a >= 1e3 ? `${Math.round(a / 1e3)} rb` : `${Math.round(a)}`;
  return `Rp ${s}`;
}

type Tag = { label: string; bg: string; color: string; bar: string };
function statusOf(item: BudgetUsage): Tag {
  if (item.percentUsed >= 100) return { label: "Over", bg: "var(--downSoft)", color: "var(--down)", bar: "var(--down)" };
  if (item.percentUsed > 85) return { label: "Tight", bg: "var(--warnSoft)", color: "var(--warn)", bar: "var(--warn)" };
  return { label: "On track", bg: "var(--accentSoft)", color: "var(--accent)", bar: categoryColor(item.budget.category) };
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
  const totalSpent = usage.reduce((a, u) => a + u.spent, 0);
  const totalBudget = usage.reduce((a, u) => a + Number(u.budget.monthly_limit ?? 0), 0);

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
        setOpen(false); setEditing(null);
        reset({ category: categoryOptions[0] ?? "Other", monthly_limit: 0, period_start: "", period_end: "" });
        toast.success(editing ? "Budget updated." : "Budget added.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to save budget.");
      }
    });
  }

  return (
    <section className="mx-auto max-w-[1100px]">
      <div className="mb-[18px] flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-bold tracking-[-.01em]">Budgets</h1>
          <p className="mt-1.5 text-[13.5px]" style={{ color: "var(--muted)" }}>
            {compact(totalSpent)} of {compact(totalBudget)} budgeted · categories managed in Settings.
          </p>
        </div>
        <button type="button" onClick={startAdd} className="flex items-center gap-[7px] rounded-[10px] px-[14px] py-[9px] text-[12.5px] font-semibold transition hover:opacity-90" style={{ background: "var(--ink)", color: "var(--panel)" }}>
          + Add Budget
        </button>
      </div>

      <Modal open={open} title={editing ? "Edit Budget" : "Create Budget"} onClose={() => { setOpen(false); setEditing(null); }}>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <label className="grid gap-1 text-sm font-medium">Category<Select {...register("category")}>{categoryOptions.map((c) => <option key={c}>{c}</option>)}</Select></label>
          <label className="grid gap-1 text-sm font-medium">Monthly Limit (Rp)<Input type="number" min="0" step="any" inputMode="decimal" className="num" {...register("monthly_limit")} /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium">From date <span className="font-normal text-muted-foreground">(optional)</span><Input type="date" {...register("period_start")} /></label>
            <label className="grid gap-1 text-sm font-medium">To date <span className="font-normal text-muted-foreground">(optional)</span><Input type="date" {...register("period_end")} /></label>
          </div>
          <p className="text-xs text-muted-foreground">Leave both dates empty to track the current month automatically.</p>
          <div className="flex justify-end"><Button disabled={pending}>{pending ? "Saving…" : editing ? "Save Budget" : "Add Budget"}</Button></div>
        </form>
      </Modal>

      {usage.length === 0 ? (
        <div className="p-6 text-sm" style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--r)", color: "var(--muted)" }}>
          Create monthly category limits to see current spending and warnings.
        </div>
      ) : (
        <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(248px, 1fr))" }}>
          {usage.map((item) => {
            const tag = statusOf(item);
            const color = categoryColor(item.budget.category);
            const remaining = Number(item.budget.monthly_limit) - item.spent;
            return (
              <div key={item.budget.id} className="group p-4" style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--r)", boxShadow: "var(--sh)" }}>
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-[9px]"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: color }} /><span className="text-[13.5px] font-semibold">{item.budget.category}</span></div>
                  <span className="num rounded-[6px] px-2 py-[3px] text-[10.5px] font-bold" style={{ background: tag.bg, color: tag.color }}>{tag.label}</span>
                </div>
                <div className="mb-[11px] flex items-end gap-[7px]">
                  <div className="num-balance num text-[21px] font-semibold">{compact(item.spent)}</div>
                  <div className="mb-1 text-[11px]" style={{ color: "var(--faint)" }}>of {compact(Number(item.budget.monthly_limit))}</div>
                </div>
                <div className="mb-[11px] h-2 overflow-hidden rounded-[5px]" style={{ background: "var(--soft)" }}>
                  <div className="h-full rounded-[5px]" style={{ width: `${Math.min(item.percentUsed, 100)}%`, background: tag.bar }} />
                </div>
                <div className="flex items-center justify-between text-[11.5px]">
                  <span style={{ color: "var(--muted)" }}>{formatPercent(item.percentUsed)} used</span>
                  <span className="num font-semibold" style={{ color: remaining < 0 ? "var(--down)" : "var(--muted)" }}>
                    {remaining < 0 ? `−${compact(Math.abs(remaining))} over` : `${compact(remaining)} left`}
                  </span>
                </div>
                <div className="mt-3 flex justify-end gap-1.5 opacity-0 transition group-hover:opacity-100">
                  <button type="button" onClick={() => editBudget(item.budget)} aria-label="Edit" className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ border: "1px solid var(--border)", color: "var(--muted)" }}><Pencil size={13} /></button>
                  <ConfirmDeleteButton compact itemName={`${item.budget.category} budget`} successMessage="Budget deleted." onConfirm={() => deleteBudget(item.budget.id)} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
