"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { realizedTradeSchema } from "@/lib/validations";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("You must be logged in.");
  return { supabase, user };
}

// Adjust the linked investment wallet balance by a delta of realized P&L.
async function adjustWalletBalance(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  walletId: string | null,
  delta: number
) {
  if (!walletId || !delta) return;
  const { data: account } = await supabase
    .from("accounts")
    .select("current_balance")
    .eq("id", walletId)
    .eq("user_id", userId)
    .single();
  if (!account) return;
  const next = Number(account.current_balance ?? 0) + delta;
  await supabase.from("accounts").update({ current_balance: next }).eq("id", walletId).eq("user_id", userId);
}

export async function upsertTrade(input: unknown) {
  const parsed = realizedTradeSchema.parse(input);
  const { supabase, user } = await requireUser();

  const payload = {
    wallet_id: parsed.wallet_id,
    ordered_item: parsed.ordered_item,
    lot: parsed.lot,
    price: parsed.price,
    amount_done: parsed.amount_done,
    total_fee: parsed.total_fee,
    net_amount: parsed.net_amount,
    realized_pnl: parsed.realized_pnl,
    trade_date: parsed.trade_date
  };

  if (parsed.id) {
    const { data: old } = await supabase
      .from("realized_trades")
      .select("realized_pnl, wallet_id")
      .eq("id", parsed.id)
      .eq("user_id", user.id)
      .single();
    const { error } = await supabase
      .from("realized_trades")
      .update(payload)
      .eq("id", parsed.id)
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);
    // reverse old effect, apply new
    if (old) await adjustWalletBalance(supabase, user.id, old.wallet_id ?? null, -Number(old.realized_pnl ?? 0));
    await adjustWalletBalance(supabase, user.id, parsed.wallet_id, parsed.realized_pnl);
  } else {
    const { error } = await supabase.from("realized_trades").insert({ ...payload, user_id: user.id });
    if (error) throw new Error(error.message);
    await adjustWalletBalance(supabase, user.id, parsed.wallet_id, parsed.realized_pnl);
  }

  revalidatePath("/equity");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

export async function deleteTrade(id: string) {
  const { supabase, user } = await requireUser();
  const { data: old } = await supabase
    .from("realized_trades")
    .select("realized_pnl, wallet_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  const { error } = await supabase.from("realized_trades").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw new Error(error.message);
  if (old) await adjustWalletBalance(supabase, user.id, old.wallet_id ?? null, -Number(old.realized_pnl ?? 0));
  revalidatePath("/equity");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}
