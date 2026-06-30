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

async function applyOne(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  userId: string,
  args: {
    id?: string | null;
    type: "income" | "outcome" | "transfer" | "covering";
    amount: number;
    fee?: number;
    category: string;
    from?: string | null;
    to?: string | null;
    date: string;
    notes?: string | null;
    name?: string | null;
    coveredFor?: string | null;
  }
) {
  const { data: txId, error } = await supabase.rpc("apply_transaction", {
    p_transaction_id: args.id ?? null,
    p_user_id: userId,
    p_type: args.type,
    p_amount: args.amount,
    p_fee: args.fee ?? 0,
    p_category: args.category,
    p_from_account_id: args.from ?? null,
    p_to_account_id: args.to ?? null,
    p_transaction_date: args.date,
    p_notes: args.notes ?? null
  });
  if (error) throw new Error(error.message);
  if (txId && args.name !== undefined) {
    await supabase.rpc("set_transaction_name", { p_id: txId, p_name: args.name ?? null });
  }
  if (txId && args.type === "covering" && args.coveredFor !== undefined) {
    await supabase.rpc("set_covering_info", { p_id: txId, p_covered_for: args.coveredFor ?? null });
  }
  return txId as string | null;
}

export async function upsertTransaction(input: unknown) {
  const parsed = transactionSchema.parse(input);
  const { supabase, user } = await requireUser();

  // Cover Bill: split the total into MY expense (normal outcome) + the
  // reimbursable LOAN (covering, excluded from expenses, settleable).
  if (parsed.type === "covering" && !parsed.id) {
    const total = parsed.amount;
    const mine = Math.min(parsed.my_expense ?? 0, total);
    const loan = total - mine;
    const from = parsed.from_account_id ?? null;
    const myCategory = parsed.category ?? "Miscellaneous";

    if (mine > 0) {
      await applyOne(supabase, user.id, {
        type: "outcome", amount: mine, fee: 0, category: myCategory,
        from, date: parsed.transaction_date,
        notes: parsed.notes ?? null,
        name: parsed.name ? `${parsed.name} (my share)` : "Cover Bill (my share)"
      });
    }
    if (loan > 0) {
      await applyOne(supabase, user.id, {
        type: "covering", amount: loan, fee: 0, category: "Financial",
        from, date: parsed.transaction_date, notes: parsed.notes ?? null,
        name: parsed.name ?? null, coveredFor: parsed.covered_for ?? null
      });
    }

    revalidatePath("/transactions");
    revalidatePath("/dashboard");
    revalidatePath("/accounts");
    return;
  }

  // Transfer fee → its own "Fee" expense so it counts as spending, while the
  // move itself stays a plain Move Money entry (fee not bundled into it).
  if (parsed.type === "transfer" && !parsed.id && (parsed.fee ?? 0) > 0) {
    const from = parsed.from_account_id ?? null;
    await applyOne(supabase, user.id, {
      type: "transfer", amount: parsed.amount, fee: 0, category: "Move Money",
      from, to: parsed.to_account_id ?? null, date: parsed.transaction_date,
      notes: parsed.notes ?? null, name: parsed.name
    });
    await applyOne(supabase, user.id, {
      type: "outcome", amount: parsed.fee ?? 0, fee: 0, category: "Fee",
      from, date: parsed.transaction_date, notes: parsed.notes ?? null,
      name: parsed.name ? `${parsed.name} (transfer fee)` : "Transfer fee"
    });
    revalidatePath("/transactions");
    revalidatePath("/dashboard");
    revalidatePath("/accounts");
    return;
  }

  // Move Money keeps its own category and never lands in expense analytics.
  const category =
    parsed.type === "transfer" ? "Move Money"
    : parsed.type === "covering" ? "Financial"
    : (parsed.category ?? "Miscellaneous");

  await applyOne(supabase, user.id, {
    id: parsed.id ?? null,
    type: parsed.type,
    amount: parsed.amount,
    fee: parsed.fee ?? 0,
    category,
    from: parsed.from_account_id ?? null,
    to: parsed.to_account_id ?? null,
    date: parsed.transaction_date,
    notes: parsed.notes ?? null,
    name: parsed.name,
    coveredFor: parsed.type === "covering" ? (parsed.covered_for ?? null) : undefined
  });

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
