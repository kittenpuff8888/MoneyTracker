"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDeleteButton } from "@/components/ui/ConfirmDeleteButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { upsertGoal, deleteGoal } from "@/lib/actions/goals";
import { typedZodResolver } from "@/lib/form-resolver";
import { goalSchema } from "@/lib/validations";
import { formatIDR } from "@/lib/formatters";
import { categoryColor } from "@/lib/category-colors";
import type { Account, Goal } from "@/lib/types";
import type { z } from "zod";

type GoalValues = z.infer<typeof goalSchema>;

function num(v: number | string | null | undefined) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}
function compact(n: number) {
  const a = Math.abs(n);
  const s = a >= 1e9 ? `${(a / 1e9).toFixed(1)} M` : a >= 1e6 ? `${(a / 1e6).toFixed(1)} jt` : a >= 1e3 ? `${Math.round(a / 1e3)} rb` : `${Math.round(a)}`;
  return `Rp ${s}`;
}
function dateLabel(d: string | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); } catch { return d; }
}

export function GoalsManager({
  accounts,
  goals,
  categories
}: {
  accounts: Account[];
  goals: Goal[];
  categories: string[];
}) {
  const [editing, setEditing] = useState<Goal | null>(null);
  const [open, setOpen] = useState(false);

  const savingsAccounts = useMemo(() => accounts.filter((a) => a.type === "Savings"), [accounts]);
  const balanceOf = (id: string | null) => num(accounts.find((a) => a.id === id)?.current_balance);

  const computed = goals.map((g) => {
    const target = num(g.target_amount);
    // Saved amount tracks the linked Savings wallet's live balance (falls back to current_amount)
    const saved = g.wallet_id ? balanceOf(g.wallet_id) : num(g.current_amount);
    const pct = target > 0 ? Math.min((saved / target) * 100, 100) : 0;
    const achieved = target > 0 && saved >= target;
    const overdue = !achieved && g.deadline ? new Date(g.deadline) < new Date() : false;
    return { g, target, saved, pct, achieved, overdue, remaining: Math.max(target - saved, 0) };
  });

  const totalTarget = computed.reduce((a, c) => a + c.target, 0);
  const totalSaved = computed.reduce((a, c) => a + c.saved, 0);

  function startAdd() { setEditing(null); setOpen(true); }
  function startEdit(g: Goal) { setEditing(g); setOpen(true); }

  return (
    <section className="mx-auto max-w-[1100px]">
      <div className="mb-[18px] flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-bold tracking-[-.01em]">Goals</h1>
          <p className="mt-1.5 text-[13.5px]" style={{ color: "var(--muted)" }}>
            {compact(totalSaved)} of {compact(totalTarget)} saved across {goals.length} goal{goals.length === 1 ? "" : "s"} · each goal tracks a linked Savings wallet.
          </p>
        </div>
        <button type="button" onClick={startAdd} className="flex items-center gap-[7px] rounded-[10px] px-[14px] py-[9px] text-[12.5px] font-semibold transition hover:opacity-90" style={{ background: "var(--ink)", color: "var(--panel)" }}>
          + Add Goal
        </button>
      </div>

      {goals.length === 0 ? (
        <EmptyState title="No goals yet." description="Add a goal and link it to a Savings wallet to track your progress." />
      ) : (
        <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          {computed.map(({ g, target, saved, pct, achieved, overdue, remaining }) => {
            const color = categoryColor(g.category || g.name);
            const wallet = accounts.find((a) => a.id === g.wallet_id)?.name ?? "—";
            const tag = achieved
              ? { label: "Achieved", bg: "var(--upSoft)", color: "var(--up)" }
              : overdue
                ? { label: "Behind", bg: "var(--downSoft)", color: "var(--down)" }
                : { label: "On track", bg: "var(--accentSoft)", color: "var(--accent)" };
            return (
              <div key={g.id} className="group p-4" style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--r)", boxShadow: "var(--sh)" }}>
                <div className="mb-3 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full px-[9px] py-[3px] text-[11px] font-semibold" style={{ background: `${color}1f`, color }}>{g.category || "Goal"}</span>
                  <span className="num rounded-[6px] px-2 py-[3px] text-[10.5px] font-bold" style={{ background: tag.bg, color: tag.color }}>{tag.label}</span>
                </div>

                <div className="mb-1 text-[15px] font-bold">{g.name}</div>
                {g.description && (
                  <p className="mb-3 text-[12px] leading-[1.5]" style={{ color: "var(--muted)" }}>{g.description}</p>
                )}

                <div className="mb-1.5 flex items-center justify-between text-[12px]">
                  <span style={{ color: "var(--muted)" }}>{Math.round(pct)}%</span>
                  <span className="num" style={{ color: "var(--muted)" }}>{compact(saved)} / {compact(target)}</span>
                </div>
                <div className="mb-3 h-2 overflow-hidden rounded-[5px]" style={{ background: "var(--soft)" }}>
                  <div className="h-full rounded-[5px]" style={{ width: `${pct}%`, background: tag.color }} />
                </div>
                <div className="mb-3 flex items-center justify-between text-[11.5px]">
                  <span style={{ color: "var(--muted)" }}>Remaining</span>
                  <span className="num font-semibold">{compact(remaining)}</span>
                </div>

                <div className="grid grid-cols-2 gap-y-2.5 pt-3" style={{ borderTop: "1px solid var(--hair)" }}>
                  <div>
                    <div className="text-[12.5px] font-semibold">{wallet}</div>
                    <div className="text-[10.5px]" style={{ color: "var(--faint)" }}>Wallet</div>
                  </div>
                  <div className="text-right">
                    <div className="num text-[12.5px] font-semibold">{dateLabel(g.start_date)}</div>
                    <div className="text-[10.5px]" style={{ color: "var(--faint)" }}>Start Date</div>
                  </div>
                  <div>
                    <div className="num text-[12.5px] font-semibold">{formatIDR(target)}</div>
                    <div className="text-[10.5px]" style={{ color: "var(--faint)" }}>Target</div>
                  </div>
                  <div className="text-right">
                    <div className="num text-[12.5px] font-semibold">{dateLabel(g.deadline)}</div>
                    <div className="text-[10.5px]" style={{ color: "var(--faint)" }}>Target Date</div>
                  </div>
                </div>

                <div className="mt-3 flex justify-end gap-1.5 opacity-0 transition group-hover:opacity-100">
                  <button type="button" onClick={() => startEdit(g)} aria-label="Edit" className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ border: "1px solid var(--border)", color: "var(--muted)" }}><Pencil size={13} /></button>
                  <ConfirmDeleteButton compact itemName={`${g.name} goal`} successMessage="Goal deleted." onConfirm={() => deleteGoal(g.id)} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {open && (
        <GoalModal
          goal={editing}
          savingsAccounts={savingsAccounts}
          categories={categories}
          onClose={() => { setOpen(false); setEditing(null); }}
        />
      )}
    </section>
  );
}

const lbl = "mb-1.5 text-[11.5px] font-semibold";
const fieldCls = "w-full rounded-[10px] px-[11px] py-[10px] text-[13px] outline-none";
const fieldStyle = { background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)" } as const;

function GoalModal({
  goal,
  savingsAccounts,
  categories,
  onClose
}: {
  goal: Goal | null;
  savingsAccounts: Account[];
  categories: string[];
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const today = new Date().toISOString().slice(0, 10);
  const { register, handleSubmit, formState: { errors } } = useForm<GoalValues>({
    resolver: typedZodResolver<GoalValues>(goalSchema),
    defaultValues: {
      id: goal?.id,
      name: goal?.name ?? "",
      wallet_id: goal?.wallet_id ?? savingsAccounts[0]?.id ?? "",
      category: goal?.category ?? (categories[0] ?? ""),
      description: goal?.description ?? "",
      target_amount: goal ? Number(goal.target_amount) : 0,
      start_date: goal?.start_date ?? today,
      deadline: goal?.deadline ?? ""
    }
  });

  function onSubmit(values: GoalValues) {
    startTransition(async () => {
      try {
        await upsertGoal(values);
        toast.success(goal ? "Goal updated." : "Goal added.");
        onClose();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to save goal.");
      }
    });
  }

  const noWallet = savingsAccounts.length === 0;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-6" style={{ background: "rgba(11,14,20,.5)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="animate-fadein w-full max-w-[520px] overflow-hidden" style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "18px", boxShadow: "0 24px 60px rgba(0,0,0,.3)" }}>
        <div className="flex items-center justify-between px-[22px] py-[18px]" style={{ borderBottom: "1px solid var(--hair)" }}>
          <div>
            <div className="text-[16px] font-bold">{goal ? "Edit Goal" : "Add Goal"}</div>
            <div className="mt-0.5 text-[12px]" style={{ color: "var(--muted)" }}>Pick a Savings wallet — its balance tracks your progress.</div>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="flex h-[30px] w-[30px] items-center justify-center rounded-lg" style={{ border: "1px solid var(--border)", color: "var(--muted)" }}>✕</button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="px-[22px] py-5">
            {noWallet ? (
              <div className="rounded-[12px] p-3.5 text-[13px]" style={{ background: "var(--warnSoft)", color: "var(--warn)" }}>
                You have no Savings wallet yet. Create a wallet of type <strong>Savings</strong> on the Wallet page first, then add a goal linked to it.
              </div>
            ) : (
              <>
                {/* Wallet first */}
                <div className="mb-3.5">
                  <div className={lbl}>Savings wallet</div>
                  <select {...register("wallet_id")} className={`${fieldCls} cursor-pointer`} style={fieldStyle}>
                    {savingsAccounts.map((a) => <option key={a.id} value={a.id}>{a.name} · {formatIDR(Number(a.current_balance))}</option>)}
                  </select>
                  {errors.wallet_id && <span className="text-[11px]" style={{ color: "var(--down)" }}>{errors.wallet_id.message}</span>}
                </div>

                <div className="mb-3.5 grid grid-cols-2 gap-3">
                  <div>
                    <div className={lbl}>Goal name</div>
                    <input placeholder="e.g. New Laptop" {...register("name")} className={fieldCls} style={fieldStyle} />
                    {errors.name && <span className="text-[11px]" style={{ color: "var(--down)" }}>{errors.name.message}</span>}
                  </div>
                  <div>
                    <div className={lbl}>Category</div>
                    <select {...register("category")} className={`${fieldCls} cursor-pointer`} style={fieldStyle}>
                      {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="mb-3.5">
                  <div className={lbl}>Target amount</div>
                  <div className="flex items-center gap-2 rounded-[10px] px-[11px] py-[10px]" style={fieldStyle}>
                    <span className="num text-[13px]" style={{ color: "var(--muted)" }}>Rp</span>
                    <input type="number" min="0" step="any" inputMode="numeric" placeholder="5000000" {...register("target_amount")} className="num w-full border-none bg-transparent text-[13px] outline-none" style={{ color: "var(--text)" }} />
                  </div>
                  {errors.target_amount && <span className="text-[11px]" style={{ color: "var(--down)" }}>{errors.target_amount.message}</span>}
                </div>

                <div className="mb-3.5">
                  <div className={lbl}>Description <span style={{ color: "var(--faint)", fontWeight: 400 }}>(optional)</span></div>
                  <textarea placeholder="What is this goal for?" rows={2} {...register("description")} className={fieldCls} style={{ ...fieldStyle, resize: "vertical" }} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div><div className={lbl}>Start date</div><input type="date" {...register("start_date")} className={`num ${fieldCls}`} style={fieldStyle} /></div>
                  <div><div className={lbl}>Target date</div><input type="date" {...register("deadline")} className={`num ${fieldCls}`} style={fieldStyle} /></div>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center justify-end gap-2.5 px-[22px] py-4" style={{ borderTop: "1px solid var(--hair)" }}>
            <button type="button" onClick={onClose} className="rounded-[10px] px-[18px] py-2.5 text-[13px] font-semibold" style={{ border: "1px solid var(--border)", color: "var(--muted)" }}>Cancel</button>
            <button type="submit" disabled={pending || noWallet} className="rounded-[10px] px-5 py-2.5 text-[13px] font-semibold transition hover:opacity-90 disabled:opacity-50" style={{ background: "var(--ink)", color: "var(--panel)" }}>
              {pending ? "Saving…" : goal ? "Save Goal" : "Add Goal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
