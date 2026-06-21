"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { subscriptionSchema } from "@/lib/validations";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("You must be logged in.");
  return { supabase, user };
}

export async function upsertSubscription(input: unknown) {
  const parsed = subscriptionSchema.parse(input);
  const { supabase, user } = await requireUser();
  const payload = {
    name: parsed.name,
    amount: parsed.amount,
    billing_date: parsed.billing_date,
    category: parsed.category,
    account_id: parsed.account_id ?? null,
    frequency: parsed.frequency,
    notes: parsed.notes ?? null
  };
  const query = parsed.id
    ? supabase.from("subscriptions").update(payload).eq("id", parsed.id).eq("user_id", user.id)
    : supabase.from("subscriptions").insert({ ...payload, user_id: user.id });
  const { error } = await query;
  if (error) throw new Error(error.message);
  revalidatePath("/subscriptions");
  revalidatePath("/dashboard");
}

export async function deleteSubscription(id: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("subscriptions").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/subscriptions");
  revalidatePath("/dashboard");
}
