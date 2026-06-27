"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { transactionSchema } from "@/lib/validations";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("You must be logged in.");
  return { supabase, user };
}

export async function upsertTransaction(input: unknown) {
  const parsed = transactionSchema.parse(input);
  const { supabase, user } = await requireUser();

  const { error } = await supabase.rpc("apply_transaction", {
    p_transaction_id: parsed.id ?? null,
    p_user_id: user.id,
    p_type: parsed.type,
    p_amount: parsed.amount,
    p_fee: parsed.fee ?? 0,
    p_category: parsed.category,
    p_from_account_id: parsed.from_account_id ?? null,
    p_to_account_id: parsed.to_account_id ?? null,
    p_transaction_date: parsed.transaction_date,
    p_notes: parsed.notes ?? null
  });

  if (error) throw new Error(error.message);
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
}

export async function deleteTransaction(id: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.rpc("delete_transaction_and_rebalance", {
    p_transaction_id: id,
    p_user_id: user.id
  });
  if (error) throw new Error(error.message);
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
}
