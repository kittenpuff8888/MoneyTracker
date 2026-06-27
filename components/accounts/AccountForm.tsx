"use client";

import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { upsertAccount } from "@/lib/actions/accounts";
import { typedZodResolver } from "@/lib/form-resolver";
import { accountSchema } from "@/lib/validations";
import { WALLET_ICONS } from "@/lib/wallet-icons";
import { cn } from "@/lib/utils";
import type { Account } from "@/lib/types";
import type { z } from "zod";

type AccountFormValues = z.infer<typeof accountSchema>;

const WALLET_TYPES: AccountFormValues["type"][] = [
  "Bank",
  "Cash",
  "E-wallet",
  "E-Money",
  "Investment",
  "Savings",
  "Other"
];

function defaults(account?: Account | null): AccountFormValues {
  return {
    id: account?.id,
    name: account?.name ?? "",
    type: (account?.type as AccountFormValues["type"]) ?? "Bank",
    starting_balance: account?.starting_balance ?? 0,
    current_balance: account?.current_balance ?? 0,
    color: account?.color ?? "#38bdf8",
    icon: account?.icon ?? "wallet"
  };
}

export function AccountForm({ account, onSaved }: { account?: Account | null; onSaved?: () => void }) {
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, reset, watch, setValue } = useForm<AccountFormValues>({
    resolver: typedZodResolver<AccountFormValues>(accountSchema),
    defaultValues: defaults(account)
  });

  const selectedIcon = watch("icon") ?? "wallet";

  useEffect(() => {
    reset(defaults(account));
  }, [account, reset]);

  function onSubmit(values: AccountFormValues) {
    startTransition(async () => {
      try {
        await upsertAccount(values);
        reset(defaults(null));
        onSaved?.();
        toast.success(account ? "Wallet updated." : "Wallet created.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to save wallet.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-3">
      <label className="grid gap-1 text-sm font-medium">
        Name
        <Input placeholder="Main Wallet" {...register("name")} />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Type
        <Select {...register("type")}>
          {WALLET_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </Select>
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Current Balance
        <Input type="number" min="0" step="any" inputMode="decimal" disabled={Boolean(account)} {...register("current_balance")} />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Starting Balance
        <Input type="number" min="0" step="any" inputMode="decimal" disabled={Boolean(account)} {...register("starting_balance")} />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Color
        <Input type="color" {...register("color")} />
      </label>

      <input type="hidden" {...register("icon")} />
      <div className="grid gap-1 text-sm font-medium md:col-span-3">
        Icon
        <div className="flex flex-wrap gap-2">
          {WALLET_ICONS.map((entry) => {
            const Icon = entry.icon;
            const active = selectedIcon === entry.name;
            return (
              <button
                key={entry.name}
                type="button"
                title={entry.label}
                aria-label={entry.label}
                aria-pressed={active}
                onClick={() => setValue("icon", entry.name, { shouldDirty: true })}
                className={cn(
                  "grid h-11 w-11 place-items-center rounded-lg border transition",
                  active
                    ? "border-sky-500 bg-sky-50 text-sky-700 ring-2 ring-sky-200"
                    : "border-border text-muted-foreground hover:border-sky-300 hover:text-foreground"
                )}
              >
                <Icon size={18} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="md:col-span-3 md:justify-self-end">
        <Button type="submit" disabled={pending}>
          <Save size={16} />
          {pending ? "Saving..." : account ? "Save Wallet" : "Create Wallet"}
        </Button>
      </div>
    </form>
  );
}
