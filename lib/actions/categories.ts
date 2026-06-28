"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { categorySchema } from "@/lib/validations";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("You must be logged in.");
  return { supabase, user };
}

function revalidateAll() {
  revalidatePath("/settings");
  revalidatePath("/transactions");
  revalidatePath("/budget");
  revalidatePath("/dashboard");
}

export async function upsertCategory(input: unknown) {
  const parsed = categorySchema.parse(input);
  const { supabase, user } = await requireUser();
  if (parsed.id) {
    const { error } = await supabase
      .from("transaction_categories")
      .update({ name: parsed.name, kind: parsed.kind })
      .eq("id", parsed.id)
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("transaction_categories")
      .insert({ user_id: user.id, name: parsed.name, kind: parsed.kind });
    if (error) throw new Error(error.message.includes("duplicate") ? "That category already exists." : error.message);
  }
  revalidateAll();
}

export async function deleteCategory(id: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("transaction_categories").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidateAll();
}
