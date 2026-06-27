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
import type { Account } from "@/lib/types";
import type { z } from "zod";

type AccountFormValues = z.infer<typeof accountSchema>;

export function AccountForm({ account, onSaved }: { account?: Account | null; onSaved?: () => void }) {
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, reset } = useForm<AccountFormValues>({
    resolver: typedZodResolver<AccountFormValues>(accountSchema),
    defaultValues: {
      id: account?.id,
      name: account?.name ?? "",
      type: (account?.type as AccountFormValues["type"]) ?? "Bank",
      starting_balance: account?.starting_balance ?? 0,
      current_balance: account?.current_balance ?? 0,
      color: account?.color ?? "#38bdf8",
      icon: account?.icon ?? "wallet"
    }
  });

  useEffect(() => {
    reset({
      id: account?.id,
      name: account?.name ?? "",
      type: (account?.type as AccountFormValues["type"]) ?? "Bank",
      starting_balance: account?.starting_balance ?? 0,
      current_balance: account?.current_balance ?? 0,
      color: account?.color ?? "#38bdf8",
      icon: account?.icon ?? "wallet"
    });
  }, [account, reset]);

  function onSubmit(values: AccountFormValues) {
    startTransition(async () => {
      try {
        await upsertAccount(values);
        reset({ name: "", type: "Bank", starting_balance: 0, current_balance: 0, color: "#38bdf8", icon: "wallet" });
        onSaved?.();
        toast.success(account ? "Account updated." : "Account created.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to save account.");
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
          {["Bank", "Cash", "E-wallet", "Investment", "Savings", "Other"].map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </Select>
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Current Balance
        <Input type="number" min="0" step="1000" disabled={Boolean(account)} {...register("current_balance")} />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Starting Balance
        <Input type="number" min="0" step="1000" disabled={Boolean(account)} {...register("starting_balance")} />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Color
        <Input type="color" {...register("color")} />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Icon
        <Input placeholder="wallet" {...register("icon")} />
      </label>
      <div className="md:col-span-3 md:justify-self-end">
        <Button type="submit" disabled={pending}>
          <Save size={16} />
          {pending ? "Saving..." : account ? "Save Account" : "Create Account"}
        </Button>
      </div>
    </form>
  );
}
