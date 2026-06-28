"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { settingsSchema } from "@/lib/validations";

export async function updateSettings(input: unknown) {
  const parsed = settingsSchema.parse(input);
  const supabase = await createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("You must be logged in.");

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.full_name,
      weekly_report_enabled: parsed.weekly_report_enabled,
      report_frequency: parsed.report_frequency,
      report_day: parsed.report_day,
      report_time: parsed.report_time,
      pay_day: parsed.pay_day,
      // keep legacy column in sync for the existing weekly cron
      weekly_report_day: parsed.report_frequency === "weekly" ? parsed.report_day : "sunday"
    })
    .eq("id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}
