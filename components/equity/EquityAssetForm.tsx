"use client";

import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { upsertEquityAsset } from "@/lib/actions/equity";
import { typedZodResolver } from "@/lib/form-resolver";
import { equityAssetSchema } from "@/lib/validations";
import type { EquityAsset } from "@/lib/types";
import type { z } from "zod";

type EquityFormValues = z.infer<typeof equityAssetSchema>;

export function EquityAssetForm({ asset, onSaved }: { asset?: EquityAsset | null; onSaved?: () => void }) {
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, reset } = useForm<EquityFormValues>({
    resolver: typedZodResolver<EquityFormValues>(equityAssetSchema),
    defaultValues: {
      id: asset?.id,
      name: asset?.name ?? "",
      symbol: asset?.symbol ?? "",
      asset_type: (asset?.asset_type as EquityFormValues["asset_type"]) ?? "Stock",
      amount_invested: asset?.amount_invested ?? 0,
      current_value: asset?.current_value ?? 0,
      quantity: asset?.quantity ?? 0,
      notes: asset?.notes ?? ""
    }
  });

  useEffect(() => {
    reset({
      id: asset?.id,
      name: asset?.name ?? "",
      symbol: asset?.symbol ?? "",
      asset_type: (asset?.asset_type as EquityFormValues["asset_type"]) ?? "Stock",
      amount_invested: asset?.amount_invested ?? 0,
      current_value: asset?.current_value ?? 0,
      quantity: asset?.quantity ?? 0,
      notes: asset?.notes ?? ""
    });
  }, [asset, reset]);

  function onSubmit(values: EquityFormValues) {
    startTransition(async () => {
      try {
        await upsertEquityAsset(values);
        reset({ name: "", symbol: "", asset_type: "Stock", amount_invested: 0, current_value: 0, quantity: 0, notes: "" });
        onSaved?.();
        toast.success(asset ? "Investment asset updated." : "Investment asset added.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to save investment asset.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-3">
      <label className="grid gap-1 text-sm font-medium">
        Name
        <Input placeholder="BBCA" {...register("name")} />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Symbol
        <Input placeholder="BBCA.JK" {...register("symbol")} />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Asset Type
        <Select {...register("asset_type")}>
          {["Stock", "ETF", "Mutual Fund", "Crypto", "Bond", "Cash", "Other"].map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </Select>
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Amount Invested
        <Input type="number" min="0" step="1000" {...register("amount_invested")} />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Current Value
        <Input type="number" min="0" step="1000" {...register("current_value")} />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Quantity
        <Input type="number" min="0" step="0.0001" {...register("quantity")} />
      </label>
      <label className="grid gap-1 text-sm font-medium md:col-span-3">
        Notes
        <Textarea {...register("notes")} />
      </label>
      <div className="md:col-span-3 md:justify-self-end">
        <Button type="submit" disabled={pending}>
          <Save size={16} />
          {pending ? "Saving..." : asset ? "Save Asset" : "Add Asset"}
        </Button>
      </div>
    </form>
  );
}
