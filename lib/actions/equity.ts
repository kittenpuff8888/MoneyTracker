"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { equityAssetSchema } from "@/lib/validations";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("You must be logged in.");
  return { supabase, user };
}

export async function upsertEquityAsset(input: unknown) {
  const parsed = equityAssetSchema.parse(input);
  const { supabase, user } = await requireUser();
  const payload = {
    name: parsed.name,
    symbol: parsed.symbol ?? null,
    asset_type: parsed.asset_type,
    amount_invested: parsed.amount_invested,
    current_value: parsed.current_value,
    quantity: parsed.quantity,
    notes: parsed.notes ?? null
  };
  const query = parsed.id
    ? supabase.from("equity_assets").update(payload).eq("id", parsed.id).eq("user_id", user.id)
    : supabase.from("equity_assets").insert({ ...payload, user_id: user.id });
  const { error } = await query;
  if (error) throw new Error(error.message);
  revalidatePath("/equity");
  revalidatePath("/dashboard");
}

export async function deleteEquityAsset(id: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("equity_assets").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/equity");
  revalidatePath("/dashboard");
}
