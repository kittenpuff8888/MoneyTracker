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
  const name = parsed.name.trim();
  if (!name) throw new Error("Category name is required.");
  const { supabase, user } = await requireUser();

  if (parsed.id) {
    const { error } = await supabase
      .from("transaction_categories")
      .update({ name, kind: parsed.kind })
      .eq("id", parsed.id)
      .eq("user_id", user.id);
    if (error) {
      throw new Error(
        error.message.toLowerCase().includes("duplicate") || error.code === "23505"
          ? "Another category already uses that name."
          : error.message
      );
    }
  } else {
    // Upsert so re-adding an existing name updates it instead of failing on the
    // UNIQUE(user_id, name) constraint — the one real failure path here.
    const { error } = await supabase
      .from("transaction_categories")
      .upsert({ user_id: user.id, name, kind: parsed.kind }, { onConflict: "user_id,name" });
    if (error) throw new Error(error.message);
  }
  revalidateAll();
}

export async function deleteCategory(id: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("transaction_categories").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidateAll();
}
