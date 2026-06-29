"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { goalSchema } from "@/lib/validations";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("You must be logged in.");
  return { supabase, user };
}

export async function upsertGoal(input: unknown) {
  const p = goalSchema.parse(input);
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("upsert_goal", {
    p_id: p.id ?? null,
    p_name: p.name,
    p_wallet_id: p.wallet_id,
    p_category: p.category ?? null,
    p_target: p.target_amount,
    p_start: p.start_date ?? null,
    p_deadline: p.deadline ?? null,
    p_description: p.description ?? null
  });
  if (error) throw new Error(error.message);
  revalidatePath("/goals");
  revalidatePath("/dashboard");
}

export async function deleteGoal(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("delete_goal", { p_id: id });
  if (error) throw new Error(error.message);
  revalidatePath("/goals");
  revalidatePath("/dashboard");
}
