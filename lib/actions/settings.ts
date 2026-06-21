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
      weekly_report_day: parsed.weekly_report_day
    })
    .eq("id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}
