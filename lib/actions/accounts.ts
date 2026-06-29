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
  const mutablePayload = {
    name: parsed.name,
    type: parsed.type,
    color: parsed.color || "#38bdf8",
    icon: parsed.icon || "wallet",
    card_info: parsed.card_info ?? null
  };

  const query = parsed.id
    ? supabase.from("accounts").update(mutablePayload).eq("id", parsed.id).eq("user_id", user.id)
    : supabase.from("accounts").insert({
        ...mutablePayload,
        user_id: user.id,
        starting_balance: parsed.starting_balance,
        current_balance: parsed.current_balance
      });

  const { error } = await query;
  if (error) throw new Error(error.message);

  // On edit, if the balance was changed, record the +/- difference as a
  // Miscellaneous transaction and update the balance atomically via RPC.
  if (parsed.id) {
    const { error: adjustError } = await supabase.rpc("adjust_account_balance", {
      p_account_id: parsed.id,
      p_new_balance: parsed.current_balance,
      p_user_id: user.id
    });
    if (adjustError) throw new Error(adjustError.message);
    revalidatePath("/transactions");
  }

  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

export async function deleteAccount(id: string) {
  const { supabase, user } = await requireUser();
  const [transactionsResult, subscriptionsResult] = await Promise.all([
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .or(`from_account_id.eq.${id},to_account_id.eq.${id}`),
    supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("account_id", id)
  ]);

  if (transactionsResult.error || subscriptionsResult.error) {
    throw new Error("Unable to verify whether this account is in use.");
  }

  const referenceCount = (transactionsResult.count ?? 0) + (subscriptionsResult.count ?? 0);
  if (referenceCount > 0) {
    throw new Error(
      `This account is used by ${referenceCount} transaction or subscription record(s). Move or delete those records first.`
    );
  }

  const { error } = await supabase.from("accounts").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}
