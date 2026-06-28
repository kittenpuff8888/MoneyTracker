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

// Writes go through SECURITY DEFINER RPCs (add_category / rename_category /
// delete_category) — the same reliable pattern as apply_transaction — so they
// are not affected by PostgREST/RLS edge cases on direct table writes.
export async function upsertCategory(input: unknown) {
  const parsed = categorySchema.parse(input);
  const name = parsed.name.trim();
  if (!name) throw new Error("Category name is required.");
  const { supabase } = await requireUser();

  if (parsed.id) {
    const { error } = await supabase.rpc("rename_category", { p_id: parsed.id, p_name: name });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.rpc("add_category", { p_name: name, p_kind: parsed.kind });
    if (error) throw new Error(error.message);
  }
  revalidateAll();
}

export async function deleteCategory(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("delete_category", { p_id: id });
  if (error) throw new Error(error.message);
  revalidateAll();
}
