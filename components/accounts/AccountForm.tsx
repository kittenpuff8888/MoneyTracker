"use client";

import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { upsertAccount } from "@/lib/actions/accounts";
import { typedZodResolver } from "@/lib/form-resolver";
import { accountSchema } from "@/lib/validations";
import { WALLET_ICONS } from "@/lib/wallet-icons";
import type { Account } from "@/lib/types";
import type { z } from "zod";

type AccountFormValues = z.infer<typeof accountSchema>;

const WALLET_TYPES: AccountFormValues["type"][] = ["Bank", "Cash", "E-wallet", "E-Money", "Investment", "Savings", "Other"];
const COLORS = ["#2563eb", "#e5484d", "#0b0e14", "#0e7490", "#7c3aed", "#16a34a", "#db2777", "#f59e0b"];

function defaults(account?: Account | null): AccountFormValues {
  return {
    id: account?.id,
    name: account?.name ?? "",
    type: (account?.type as AccountFormValues["type"]) ?? "Bank",
    starting_balance: account?.starting_balance ?? 0,
    current_balance: account?.current_balance ?? 0,
    color: account?.color ?? "#2563eb",
    icon: account?.icon ?? "wallet",
    card_info: account?.card_info ?? ""
  };
}

const lbl = "mb-1.5 text-[11.5px] font-semibold";
const fieldCls = "w-full rounded-[10px] px-[11px] py-[10px] text-[13px] outline-none";
const fieldStyle = { background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)" } as const;

export function AccountForm({ account, onSaved }: { account?: Account | null; onSaved?: () => void }) {
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, reset, watch, setValue } = useForm<AccountFormValues>({
    resolver: typedZodResolver<AccountFormValues>(accountSchema),
    defaultValues: defaults(account)
  });

  const selectedIcon = watch("icon") ?? "wallet";
  const selectedColor = watch("color") ?? "#2563eb";
  const isEdit = Boolean(account);

  useEffect(() => { reset(defaults(account)); }, [account, reset]);

  function onSubmit(values: AccountFormValues) {
    // New wallet: starting balance mirrors the entered current balance
    const payload = isEdit ? values : { ...values, starting_balance: values.current_balance };
    startTransition(async () => {
      try {
        await upsertAccount(payload);
        reset(defaults(null));
        onSaved?.();
        toast.success(isEdit ? "Wallet updated." : "Wallet created.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to save wallet.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="mb-3.5 grid grid-cols-2 gap-3.5">
        <div>
          <div className={lbl}>Name</div>
          <input placeholder="e.g. BCA Utama" {...register("name")} className={fieldCls} style={fieldStyle} />
        </div>
        <div>
          <div className={lbl}>Type</div>
          <select {...register("type")} className={`${fieldCls} cursor-pointer`} style={fieldStyle}>
            {WALLET_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
      </div>

      <div className="mb-4">
        <div className={lbl}>Current balance {!isEdit && <span style={{ color: "var(--faint)", fontWeight: 400 }}>(any value — not rounded)</span>}</div>
        <div className="flex items-center gap-2 rounded-[10px] px-[11px] py-[10px]" style={fieldStyle}>
          <span className="num text-[13px]" style={{ color: "var(--muted)" }}>Rp</span>
          <input type="number" min="0" step="any" inputMode="numeric" placeholder="0" disabled={isEdit} {...register("current_balance")} className="num w-full border-none bg-transparent text-[13px] outline-none disabled:opacity-60" style={{ color: "var(--text)" }} />
        </div>
      </div>

      {/* Card Info */}
      <div className="mb-4">
        <div className={lbl}>Card Info <span style={{ color: "var(--faint)", fontWeight: 400 }}>(optional — card number, notes, etc.)</span></div>
        <input placeholder="e.g. 1234 5678 9012 3456" {...register("card_info")} className={fieldCls} style={fieldStyle} />
      </div>

      {/* Color */}
      <div className="mb-4">
        <div className="mb-2 text-[11.5px] font-semibold">Color</div>
        <input type="hidden" {...register("color")} />
        <div className="flex flex-wrap gap-[9px]">
          {COLORS.map((hex) => (
            <button
              key={hex}
              type="button"
              aria-label={hex}
              onClick={() => setValue("color", hex, { shouldDirty: true })}
              className="h-[30px] w-[30px] rounded-[9px]"
              style={{ background: hex, border: `2px solid ${selectedColor === hex ? "var(--text)" : "transparent"}`, boxShadow: "0 0 0 2px var(--panel) inset" }}
            />
          ))}
        </div>
      </div>

      {/* Icon */}
      <div className="mb-2">
        <div className="mb-2 text-[11.5px] font-semibold">Icon</div>
        <input type="hidden" {...register("icon")} />
        <div className="flex flex-wrap gap-[9px]">
          {WALLET_ICONS.map((entry) => {
            const Icon = entry.icon;
            const active = selectedIcon === entry.name;
            return (
              <button
                key={entry.name}
                type="button"
                title={entry.label}
                aria-label={entry.label}
                onClick={() => setValue("icon", entry.name, { shouldDirty: true })}
                className="flex h-[42px] w-[42px] items-center justify-center rounded-[11px]"
                style={{ background: active ? "var(--ink)" : "var(--soft)", color: active ? "var(--panel)" : "var(--muted)", border: `1.5px solid ${active ? "var(--ink)" : "var(--border)"}` }}
              >
                <Icon size={20} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end gap-2.5">
        <button type="button" onClick={() => onSaved?.()} className="rounded-[10px] px-[18px] py-2.5 text-[13px] font-semibold" style={{ border: "1px solid var(--border)", color: "var(--muted)" }}>Cancel</button>
        <button type="submit" disabled={pending} className="rounded-[10px] px-5 py-2.5 text-[13px] font-semibold transition hover:opacity-90 disabled:opacity-50" style={{ background: "var(--ink)", color: "var(--panel)" }}>
          {pending ? "Saving…" : isEdit ? "Save Wallet" : "Save Wallet"}
        </button>
      </div>
    </form>
  );
}
