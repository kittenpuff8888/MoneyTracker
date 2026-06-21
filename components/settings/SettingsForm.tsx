"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { updateSettings } from "@/lib/actions/settings";
import { typedZodResolver } from "@/lib/form-resolver";
import { settingsSchema } from "@/lib/validations";
import type { Profile } from "@/lib/types";
import type { z } from "zod";

type SettingsValues = z.infer<typeof settingsSchema>;

export function SettingsForm({ profile }: { profile: Profile }) {
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit } = useForm<SettingsValues>({
    resolver: typedZodResolver<SettingsValues>(settingsSchema),
    defaultValues: {
      full_name: profile.full_name ?? "",
      weekly_report_enabled: profile.weekly_report_enabled,
      weekly_report_day: profile.weekly_report_day as SettingsValues["weekly_report_day"]
    }
  });

  function onSubmit(values: SettingsValues) {
    startTransition(async () => updateSettings(values));
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
      <label className="grid gap-1 text-sm font-medium">Full Name<Input {...register("full_name")} /></label>
      <label className="flex items-center gap-3 text-sm font-medium">
        <input type="checkbox" className="h-4 w-4 rounded border-border text-sky-500" {...register("weekly_report_enabled")} />
        Weekly report email enabled
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Weekly Report Day
        <Select {...register("weekly_report_day")}>
          {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map((day) => <option key={day}>{day}</option>)}
        </Select>
      </label>
      <label className="grid gap-1 text-sm font-medium">Currency<Input value="IDR / Indonesian Rupiah" readOnly /></label>
      <div><Button disabled={pending}>{pending ? "Saving..." : "Save Settings"}</Button></div>
    </form>
  );
}
