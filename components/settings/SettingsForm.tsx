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

function buildSummary(
  enabled: boolean,
  frequency: string,
  day: string,
  time: string
): string {
  if (!enabled) return "Automated reports are disabled.";
  const t = time || "08:00";
  const [h, m] = t.split(":").map(Number);
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const timeStr = `${h12}:${String(m).padStart(2, "0")} ${ampm} WIB`;

  if (frequency === "daily") return `You will receive a report every day at ${timeStr}.`;
  if (frequency === "weekly") {
    const dayLabel = day ? day.charAt(0).toUpperCase() + day.slice(1) : "Sunday";
    return `You will receive a report every ${dayLabel} at ${timeStr}.`;
  }
  if (frequency === "monthly") {
    const d = parseInt(day) || 1;
    const suffix = d === 1 ? "st" : d === 2 ? "nd" : d === 3 ? "rd" : "th";
    return `You will receive a report on the ${d}${suffix} of each month at ${timeStr}.`;
  }
  return "";
}

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

  const enabled = useWatch({ control, name: "weekly_report_enabled" });
  const frequency = useWatch({ control, name: "report_frequency" });
  const day = useWatch({ control, name: "report_day" });
  const time = useWatch({ control, name: "report_time" });

  const summary = buildSummary(Boolean(enabled), frequency, String(day ?? ""), String(time ?? ""));

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
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5">
      <label className="grid gap-1.5 text-sm font-medium">
        Full Name
        <Input {...register("full_name")} />
      </label>

      {/* Report schedule section */}
      <div className="rounded-xl border border-border bg-muted p-4">
        <p className="mb-3 text-sm font-semibold">Automated Report Schedule</p>

        <label className="mb-4 flex cursor-pointer items-center gap-3 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border accent-primary"
            {...register("weekly_report_enabled")}
          />
          <span>Enable automated report email</span>
        </label>

        <div className="grid gap-3 md:grid-cols-3">
          <label className="grid gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Frequency
            <Select {...register("report_frequency")} disabled={!enabled}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </Select>
          </label>

          {frequency === "weekly" && (
            <label className="grid gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Day of Week
              <Select {...register("report_day")} disabled={!enabled}>
                {weekdays.map((d) => (
                  <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                ))}
              </Select>
            </label>
          )}

          {frequency === "monthly" && (
            <label className="grid gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Day of Month
              <Input type="number" min="1" max="28" {...register("report_day")} disabled={!enabled} />
            </label>
          )}

          <label className="grid gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Time (24h WIB)
            <Input type="time" {...register("report_time")} disabled={!enabled} />
          </label>
        </div>

        {/* Live summary sentence */}
        <p className="mt-4 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          {summary}
        </p>
      </div>

      <label className="grid gap-1.5 text-sm font-medium">
        Currency
        <Input value="IDR / Indonesian Rupiah" readOnly className="bg-muted text-muted-foreground" />
      </label>

      <div>
        <Button disabled={pending}>{pending ? "Saving…" : "Save Settings"}</Button>
      </div>
    </form>
  );
}
