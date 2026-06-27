"use client";

import { useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { updateSettings } from "@/lib/actions/settings";
import { typedZodResolver } from "@/lib/form-resolver";
import { settingsSchema, weekdays } from "@/lib/validations";
import type { Profile } from "@/lib/types";
import type { z } from "zod";

type SettingsValues = z.infer<typeof settingsSchema>;

export function SettingsForm({ profile }: { profile: Profile }) {
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, control } = useForm<SettingsValues>({
    resolver: typedZodResolver<SettingsValues>(settingsSchema),
    defaultValues: {
      full_name: profile.full_name ?? "",
      weekly_report_enabled: profile.weekly_report_enabled,
      report_frequency: (profile.report_frequency as SettingsValues["report_frequency"]) ?? "weekly",
      report_day: profile.report_day ?? profile.weekly_report_day ?? "sunday",
      report_time: profile.report_time ?? "08:00"
    }
  });

  const frequency = useWatch({ control, name: "report_frequency" });

  function onSubmit(values: SettingsValues) {
    startTransition(async () => {
      try {
        await updateSettings(values);
        toast.success("Settings saved.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to save settings.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
      <label className="grid gap-1 text-sm font-medium">
        Full Name
        <Input {...register("full_name")} />
      </label>

      <label className="flex items-center gap-3 text-sm font-medium">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-border text-sky-500"
          {...register("weekly_report_enabled")}
        />
        Automated report email enabled
      </label>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-1 text-sm font-medium">
          Frequency
          <Select {...register("report_frequency")}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </Select>
        </label>

        {frequency === "weekly" ? (
          <label className="grid gap-1 text-sm font-medium">
            Day of week
            <Select {...register("report_day")}>
              {weekdays.map((day) => (
                <option key={day} value={day} className="capitalize">
                  {day.charAt(0).toUpperCase() + day.slice(1)}
                </option>
              ))}
            </Select>
          </label>
        ) : null}

        {frequency === "monthly" ? (
          <label className="grid gap-1 text-sm font-medium">
            Day of month
            <Input type="number" min="1" max="28" {...register("report_day")} />
          </label>
        ) : null}

        <label className="grid gap-1 text-sm font-medium">
          Time (24h, WIB)
          <Input type="time" {...register("report_time")} />
        </label>
      </div>

      <label className="grid gap-1 text-sm font-medium">
        Currency
        <Input value="IDR / Indonesian Rupiah" readOnly />
      </label>

      <div>
        <Button disabled={pending}>{pending ? "Saving..." : "Save Settings"}</Button>
      </div>
    </form>
  );
}
