"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { transactionSchema } from "@/lib/validations";

async function requireUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("You must be logged in.");
  return { supabase, user };
}

export async function upsertTransaction(input: unknown) {
  const parsed = transactionSchema.parse(input);
  const { supabase, user } = await requireUser();

  const category = parsed.type === "covering" ? "Financial" : (parsed.category ?? "Miscellaneous");

  // apply_transaction handles balance updates; returns the transaction id.
  const { data: txId, error } = await supabase.rpc("apply_transaction", {
    p_transaction_id: parsed.id ?? null,
    p_user_id: user.id,
    p_type: parsed.type,
    p_amount: parsed.amount,
    p_fee: parsed.fee ?? 0,
    p_category: category,
    p_from_account_id: parsed.from_account_id ?? null,
    p_to_account_id: parsed.to_account_id ?? null,
    p_transaction_date: parsed.transaction_date,
    p_notes: parsed.notes ?? null
  });

  if (error) throw new Error(error.message);

  // Patch the name/merchant field via a definer RPC.
  if (txId && parsed.name !== undefined) {
    await supabase.rpc("set_transaction_name", { p_id: txId, p_name: parsed.name ?? null });
  }

  // Patch covered_for for covering transactions.
  if (txId && parsed.type === "covering" && parsed.covered_for !== undefined) {
    await supabase.rpc("set_covering_info", { p_id: txId, p_covered_for: parsed.covered_for ?? null });
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
}

export async function settleCovering(id: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.rpc("settle_covering_transaction", {
    p_id: id,
    p_user_id: user.id
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
