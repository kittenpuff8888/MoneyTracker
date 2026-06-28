"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { budgetSchema } from "@/lib/validations";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("You must be logged in.");
  return { supabase, user };
}

export async function upsertBudget(input: unknown) {
  const parsed = budgetSchema.parse(input);
  const { supabase, user } = await requireUser();
  const payload = {
    category: parsed.category,
    monthly_limit: parsed.monthly_limit,
    period_start: parsed.period_start ?? null,
    period_end: parsed.period_end ?? null
  };
  const query = parsed.id
    ? supabase.from("budgets").update(payload).eq("id", parsed.id).eq("user_id", user.id)
    : supabase.from("budgets").insert({ ...payload, user_id: user.id });
  const { error } = await query;
  if (error) throw new Error(error.message);
  revalidatePath("/budget");
  revalidatePath("/dashboard");
}

export async function deleteBudget(id: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("budgets").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/budget");
  revalidatePath("/dashboard");
}
