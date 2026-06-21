"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { accountSchema } from "@/lib/validations";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("You must be logged in.");
  return { supabase, user };
}

export async function upsertAccount(input: unknown) {
  const parsed = accountSchema.parse(input);
  const { supabase, user } = await requireUser();
  const payload = {
    name: parsed.name,
    type: parsed.type,
    starting_balance: parsed.starting_balance,
    current_balance: parsed.current_balance,
    color: parsed.color || "#38bdf8",
    icon: parsed.icon || "wallet"
  };

  const query = parsed.id
    ? supabase.from("accounts").update(payload).eq("id", parsed.id).eq("user_id", user.id)
    : supabase.from("accounts").insert({ ...payload, user_id: user.id });

  const { error } = await query;
  if (error) throw new Error(error.message);
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

export async function deleteAccount(id: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("accounts").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}
