"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { upsertTransaction } from "@/lib/actions/transactions";
import { typedZodResolver } from "@/lib/form-resolver";
import { transactionSchema } from "@/lib/validations";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { formatIDR } from "@/lib/formatters";
import type { Account, Transaction } from "@/lib/types";
import type { z } from "zod";

type Values = z.infer<typeof transactionSchema>;
type TxType = "outcome" | "income" | "transfer" | "covering";

const today = new Date().toISOString().slice(0, 10);
const METHODS = ["QRIS", "Transfer", "Card", "VA", "Cash", "E-Money"];

function emptyValues(cat: string, type: TxType): Values {
  return {
    type,
    name: "",
    amount: 0,
    fee: 0,
    category: cat,
    from_account_id: null,
    to_account_id: null,
    transaction_date: today,
    notes: "",
    covered_for: "",
    my_expense: 0
  };
}

// Notes are stored as "METHOD · rest". Split them back apart for editing.
function splitNotes(notes: string | null): { method: string; rest: string } {
  if (!notes) return { method: "QRIS", rest: "" };
  const [head, ...tail] = notes.split("·");
  const first = head.trim();
  if (METHODS.includes(first)) return { method: first, rest: tail.join("·").trim() };
  return { method: "QRIS", rest: notes };
}

function valuesFromTx(tx: Transaction): Values {
  return {
    id: tx.id,
    type: tx.type as TxType,
    name: tx.name ?? "",
    amount: Number(tx.amount ?? 0),
    fee: Number(tx.fee ?? 0),
    category: tx.category,
    from_account_id: tx.from_account_id,
    to_account_id: tx.to_account_id,
    transaction_date: tx.transaction_date,
    notes: splitNotes(tx.notes).rest,
    covered_for: tx.covered_for ?? "",
    my_expense: 0
  };
}

const lbl = "mb-1.5 text-[11.5px] font-semibold";
const field =
  "w-full rounded-[10px] px-[11px] py-[10px] text-[13px] outline-none";
const fieldStyle = { background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)" };

export function QuickTransactionForm({
  presetType = "outcome",
  transaction,
  onSaved,
  onCancel
}: {
  presetType?: TxType;
  transaction?: Transaction | null;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const isEdit = Boolean(transaction);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [method, setMethod] = useState(() => splitNotes(transaction?.notes ?? null).method);
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
    defaultValues: transaction ? valuesFromTx(transaction) : emptyValues("Other", presetType)
  });

  // When editing a specific transaction, load its values into the form.
  useEffect(() => {
    if (transaction) {
      reset(valuesFromTx(transaction));
      setMethod(splitNotes(transaction.notes).method);
    }
  }, [transaction, reset]);

  useEffect(() => {
    // Only default the category for brand-new transactions.
    if (!isEdit && categories.length > 0) setValue("category", categories[0]);
  }, [categories, setValue, isEdit]);

  const type = (useWatch({ control, name: "type" }) ?? presetType) as TxType;
  const isMove = type === "transfer";
  const isCover = type === "covering";
  const feeLabel = isMove ? "Transfer fee" : type === "income" ? "Admin fee" : "Fee / tax";

  const walletField = type === "income" ? "to_account_id" : "from_account_id";

  const amountVal = useWatch({ control, name: "amount" }) ?? 0;
  const feeVal = useWatch({ control, name: "fee" }) ?? 0;
  const myExpenseVal = useWatch({ control, name: "my_expense" }) ?? 0;
  const loanPortion = Math.max(Number(amountVal) - Number(myExpenseVal), 0);

  const segments = useMemo(
    () => [
      { t: "outcome" as const, label: "Expense", activeBg: "var(--down)" },
      { t: "income" as const, label: "Income", activeBg: "var(--up)" },
      { t: "transfer" as const, label: "Move", activeBg: "var(--ink)" },
      { t: "covering" as const, label: "Cover Bill", activeBg: "#f59e0b" }
    ],
    []
  );

  function onSubmit(values: Values) {
    const payload: Values = {
      ...values,
      id: transaction?.id,
      notes: method ? `${method}${values.notes ? ` · ${values.notes}` : ""}` : values.notes
    };
    startTransition(async () => {
      try {
        await upsertTransaction(payload);
        if (!isEdit) reset(emptyValues(categories[0] ?? "Other", type));
        toast.success(isEdit ? "Transaction updated." : "Transaction added.");
        onSaved?.();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Unable to save transaction.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-[22px] py-5">
        {/* Type segmented control */}
        <div className="mb-4 flex gap-0.5 rounded-[11px] p-[3px]" style={{ background: "var(--soft)", border: "1px solid var(--border)" }}>
          {segments.map((s) => {
            const active = type === s.t;
            return (
              <label
                key={s.t}
                className="flex-1 cursor-pointer rounded-[9px] px-1 py-2 text-center text-[12.5px] font-semibold transition"
                style={{ background: active ? s.activeBg : "transparent", color: active ? "var(--panel)" : "var(--muted)" }}
              >
                <input type="radio" {...register("type")} value={s.t} className="sr-only" />
                {s.label}
              </label>
            );
          })}
        </div>

        {/* Name */}
        <div className="mb-3.5">
          <div className={lbl}>Transaction name</div>
          <input {...register("name")} placeholder="e.g. Starbucks Coffee, Grab Ride" className={field} style={fieldStyle} />
        </div>

        {/* Date + Amount */}
        <div className="mb-3.5 grid grid-cols-2 gap-3">
          <div>
            <div className={lbl}>Date</div>
            <input type="date" {...register("transaction_date")} className={`num ${field}`} style={fieldStyle} />
          </div>
          <div>
            <div className={lbl}>{isCover ? "Total bill" : "Amount"}</div>
            <div className="flex items-center gap-1.5 rounded-[10px] px-[11px] py-[9px]" style={fieldStyle}>
              <span className="num text-[12px]" style={{ color: "var(--muted)" }}>Rp</span>
              <CurrencyInput value={amountVal} onValueChange={(n) => setValue("amount", n, { shouldValidate: true })} placeholder="50.000" className="num w-full border-none bg-transparent text-[12.5px] outline-none" style={{ color: "var(--text)" }} />
            </div>
            {errors.amount && <span className="text-[11px]" style={{ color: "var(--down)" }}>{errors.amount.message}</span>}
          </div>
        </div>

        {/* Cover Bill: who + my share, with the reimbursable loan computed live */}
        {isCover && (
          <div className="mb-3.5 rounded-[12px] p-3" style={{ background: "#f59e0b14", border: "1px solid #f59e0b44" }}>
            <div className="mb-3 grid grid-cols-2 gap-3">
              <div>
                <div className={lbl}>Covered for (who)</div>
                <input {...register("covered_for")} placeholder="e.g. Budi, Team" className={field} style={fieldStyle} />
                {errors.covered_for && <span className="text-[11px]" style={{ color: "var(--down)" }}>{errors.covered_for.message}</span>}
              </div>
              <div>
                <div className={lbl}>My share (expense)</div>
                <div className="flex items-center gap-1.5 rounded-[10px] px-[11px] py-[9px]" style={fieldStyle}>
                  <span className="num text-[12px]" style={{ color: "var(--muted)" }}>Rp</span>
                  <CurrencyInput value={myExpenseVal} onValueChange={(n) => setValue("my_expense", n, { shouldValidate: true })} placeholder="0" className="num w-full border-none bg-transparent text-[12.5px] outline-none" style={{ color: "var(--text)" }} />
                </div>
                {errors.my_expense && <span className="text-[11px]" style={{ color: "var(--down)" }}>{errors.my_expense.message}</span>}
              </div>
            </div>
            <div className="flex items-center justify-between text-[11.5px]">
              <span style={{ color: "var(--muted)" }}>Reimbursable (loan to others)</span>
              <span className="num font-bold" style={{ color: "#f59e0b" }}>{formatIDR(loanPortion)}</span>
            </div>
            <p className="mt-1.5 text-[10.5px]" style={{ color: "var(--faint)" }}>Your share is recorded as an expense. The reimbursable part is a loan — not counted as your expense — and you can mark it settled when paid back.</p>
          </div>
        )}

        {/* Move: from + to */}
        {isMove && (
          <div className="mb-3.5 grid grid-cols-2 gap-3">
            <div>
              <div className={lbl}>From wallet</div>
              <select {...register("from_account_id")} className={`${field} cursor-pointer`} style={fieldStyle}>
                <option value="">Select</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <div className={lbl}>To wallet</div>
              <select {...register("to_account_id")} className={`${field} cursor-pointer`} style={fieldStyle}>
                <option value="">Select</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Non-move: category + wallet */}
        {!isMove && (
          <div className="mb-3.5 grid grid-cols-2 gap-3">
            <div>
              <div className={lbl}>Category</div>
              <select {...register("category")} className={`${field} cursor-pointer`} style={fieldStyle}>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <div className={lbl}>Wallet</div>
              <select {...register(walletField)} className={`${field} cursor-pointer`} style={fieldStyle}>
                <option value="">Select</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Fee + Method */}
        <div className="mb-3.5 grid grid-cols-2 gap-3">
          <div>
            <div className={lbl}>{feeLabel}</div>
            <div className="flex items-center gap-1.5 rounded-[10px] px-[11px] py-[9px]" style={fieldStyle}>
              <span className="num text-[12px]" style={{ color: "var(--muted)" }}>Rp</span>
              <CurrencyInput value={feeVal} onValueChange={(n) => setValue("fee", n, { shouldValidate: true })} placeholder="0" className="num w-full border-none bg-transparent text-[12.5px] outline-none" style={{ color: "var(--text)" }} />
            </div>
          </div>
          <div>
            <div className={lbl}>Payment method</div>
            <select value={method} onChange={(e) => setMethod(e.target.value)} className={`${field} cursor-pointer`} style={fieldStyle}>
              {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        {/* Notes */}
        <div>
          <div className={lbl}>Notes</div>
          <textarea {...register("notes")} placeholder="Add any additional details…" className={`${field} min-h-[72px] resize-y`} style={{ ...fieldStyle, fontFamily: "var(--sans)" }} />
        </div>
      </div>

      {/* Sticky footer */}
      <div
        className="sticky bottom-0 flex items-center justify-between gap-2.5 px-[22px] py-4"
        style={{ borderTop: "1px solid var(--hair)", background: "var(--panel)" }}
      >
        <span className="text-[11.5px]" style={{ color: "var(--faint)" }}>Contact support</span>
        <div className="flex gap-2.5">
          <button type="button" onClick={onCancel} className="rounded-[10px] px-4 py-2.5 text-[13px] font-semibold" style={{ border: "1px solid var(--border)", color: "var(--muted)" }}>Cancel</button>
          <button
            type="submit"
            disabled={pending || accounts.length === 0}
            className="rounded-[10px] px-[18px] py-2.5 text-[13px] font-semibold transition hover:opacity-90 disabled:opacity-50"
            style={{ background: "var(--ink)", color: "var(--panel)" }}
          >
            {accounts.length === 0 ? "Add a wallet first" : pending ? "Saving…" : isEdit ? "Save Changes" : "Save Transaction"}
          </button>
        </div>
      </div>
    </form>
  );
}
