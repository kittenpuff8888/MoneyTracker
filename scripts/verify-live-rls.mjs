import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  throw new Error("Supabase URL, anon key, and service role key are required.");
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});
const token = randomUUID().replaceAll("-", "");
const password = `Rls-${token}-A9!`;
const users = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function balance(client, accountId) {
  const { data, error } = await client
    .from("accounts")
    .select("current_balance")
    .eq("id", accountId)
    .single();
  if (error) throw error;
  return Number(data.current_balance);
}

async function applyTransaction(client, userId, input) {
  const { data, error } = await client.rpc("apply_transaction", {
    p_transaction_id: input.id ?? null,
    p_user_id: userId,
    p_type: input.type,
    p_amount: input.amount,
    p_category: "Other",
    p_from_account_id: input.from ?? null,
    p_to_account_id: input.to ?? null,
    p_transaction_date: new Date().toISOString().slice(0, 10),
    p_notes: "Disposable integrity test"
  });
  if (error) throw error;
  return data;
}

async function createTestUser(label) {
  const email = `rls-${label}-${token}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });
  if (error || !data.user) throw error ?? new Error("Test user creation failed.");
  users.push(data.user.id);

  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  const { error: profileError } = await client.rpc("sync_profile_from_auth");
  if (profileError) throw profileError;
  return { id: data.user.id, client };
}

try {
  const userA = await createTestUser("a");
  const userB = await createTestUser("b");

  const { data: accountA, error: accountAError } = await userA.client
    .from("accounts")
    .insert({
      user_id: userA.id,
      name: "RLS A",
      type: "Bank",
      starting_balance: 1000000,
      current_balance: 1000000
    })
    .select()
    .single();
  if (accountAError) throw accountAError;

  const { data: accountA2, error: accountA2Error } = await userA.client
    .from("accounts")
    .insert({
      user_id: userA.id,
      name: "RLS A Savings",
      type: "Savings",
      starting_balance: 500000,
      current_balance: 500000
    })
    .select()
    .single();
  if (accountA2Error) throw accountA2Error;

  const { data: accountB, error: accountBError } = await userB.client
    .from("accounts")
    .insert({
      user_id: userB.id,
      name: "RLS B",
      type: "Bank",
      starting_balance: 2000000,
      current_balance: 2000000
    })
    .select()
    .single();
  if (accountBError) throw accountBError;

  const { data: crossRead, error: crossReadError } = await userA.client
    .from("accounts")
    .select("*")
    .eq("id", accountB.id);
  assert(!crossReadError, "Cross-user read should be filtered, not crash.");
  assert(crossRead?.length === 0, "CRITICAL: User A can read User B's account.");

  await userA.client
    .from("accounts")
    .update({ current_balance: 999999999 })
    .eq("id", accountB.id);
  const { data: unchangedB } = await admin
    .from("accounts")
    .select("current_balance")
    .eq("id", accountB.id)
    .single();
  assert(
    Number(unchangedB?.current_balance) === 2000000,
    "CRITICAL: User A changed User B's balance."
  );

  const { error: forgedOwnerError } = await userA.client.from("accounts").insert({
    user_id: userB.id,
    name: "Forged owner",
    type: "Bank",
    starting_balance: 1,
    current_balance: 1
  });
  assert(forgedOwnerError, "CRITICAL: User A inserted an account owned by User B.");

  const { error: crossRpcError } = await userA.client.rpc("apply_transaction", {
    p_transaction_id: null,
    p_user_id: userB.id,
    p_type: "income",
    p_amount: 500000,
    p_category: "Other",
    p_from_account_id: null,
    p_to_account_id: accountB.id,
    p_transaction_date: new Date().toISOString().slice(0, 10),
    p_notes: "Cross-user attempt"
  });
  assert(crossRpcError, "CRITICAL: User A called the transaction RPC as User B.");

  const { error: helperError } = await userA.client.rpc("apply_transaction_balance", {
    p_user_id: userB.id,
    p_type: "income",
    p_amount: 500000,
    p_from_account_id: null,
    p_to_account_id: accountB.id
  });
  assert(helperError, "CRITICAL: Public balance helper remains callable.");

  const { error: directTransactionError } = await userA.client.from("transactions").insert({
    user_id: userA.id,
    type: "income",
    amount: 1,
    category: "Other",
    to_account_id: accountA.id,
    transaction_date: new Date().toISOString().slice(0, 10)
  });
  assert(directTransactionError, "Direct transaction insert should be denied; RPC is required.");

  const { error: crossSubscriptionError } = await userA.client.from("subscriptions").insert({
    user_id: userA.id,
    name: "Cross-account subscription",
    amount: 1000,
    billing_date: new Date().toISOString().slice(0, 10),
    category: "Subscription",
    frequency: "monthly",
    account_id: accountB.id
  });
  assert(crossSubscriptionError, "CRITICAL: A subscription referenced another user's account.");

  const { error: emailMutationError } = await userA.client
    .from("profiles")
    .update({ email: "attacker@example.com" })
    .eq("id", userA.id);
  assert(emailMutationError, "Authenticated users must not be able to change report email directly.");

  const { data: foreignAuditRows, error: auditError } = await userA.client
    .from("financial_audit_logs")
    .select("id")
    .eq("entity_id", accountB.id);
  assert(!auditError, "Audit log select failed.");
  assert(foreignAuditRows?.length === 0, "CRITICAL: User A can read User B's audit records.");

  await applyTransaction(userB.client, userB.id, {
    type: "outcome",
    amount: 1000,
    from: accountB.id
  });
  const { data: foreignMonthlyRows, error: monthlyViewError } = await userA.client
    .from("monthly_summary")
    .select("*")
    .eq("user_id", userB.id);
  if (monthlyViewError) throw monthlyViewError;
  assert(foreignMonthlyRows?.length === 0, "CRITICAL: Monthly aggregate view leaked User B's data.");
  const { data: foreignCategoryRows, error: categoryViewError } = await userA.client
    .from("category_monthly_spending")
    .select("*")
    .eq("user_id", userB.id);
  if (categoryViewError) throw categoryViewError;
  assert(foreignCategoryRows?.length === 0, "CRITICAL: Category aggregate view leaked User B's data.");

  const incomeId = await applyTransaction(userA.client, userA.id, {
    type: "income",
    amount: 100000,
    to: accountA.id
  });
  assert(await balance(userA.client, accountA.id) === 1100000, "Income did not increase balance.");

  await applyTransaction(userA.client, userA.id, {
    id: incomeId,
    type: "outcome",
    amount: 200000,
    from: accountA.id
  });
  assert(await balance(userA.client, accountA.id) === 800000, "Income-to-outcome edit did not reverse and apply correctly.");

  await applyTransaction(userA.client, userA.id, {
    id: incomeId,
    type: "income",
    amount: 50000,
    to: accountA2.id
  });
  assert(await balance(userA.client, accountA.id) === 1000000, "Outcome-to-income edit did not restore source.");
  assert(await balance(userA.client, accountA2.id) === 550000, "Outcome-to-income edit did not credit destination.");

  const { error: deleteIncomeError } = await userA.client.rpc("delete_transaction_and_rebalance", {
    p_transaction_id: incomeId,
    p_user_id: userA.id
  });
  if (deleteIncomeError) throw deleteIncomeError;
  assert(await balance(userA.client, accountA2.id) === 500000, "Deleting income did not restore balance.");

  const outcomeId = await applyTransaction(userA.client, userA.id, {
    type: "outcome",
    amount: 100000,
    from: accountA.id
  });
  await applyTransaction(userA.client, userA.id, {
    id: outcomeId,
    type: "outcome",
    amount: 250000,
    from: accountA.id
  });
  assert(await balance(userA.client, accountA.id) === 750000, "Outcome amount edit applied the wrong difference.");
  const { error: deleteOutcomeError } = await userA.client.rpc("delete_transaction_and_rebalance", {
    p_transaction_id: outcomeId,
    p_user_id: userA.id
  });
  if (deleteOutcomeError) throw deleteOutcomeError;
  assert(await balance(userA.client, accountA.id) === 1000000, "Deleting outcome did not restore balance.");

  const transferId = await applyTransaction(userA.client, userA.id, {
    type: "transfer",
    amount: 300000,
    from: accountA.id,
    to: accountA2.id
  });
  assert(await balance(userA.client, accountA.id) === 700000, "Transfer did not debit source.");
  assert(await balance(userA.client, accountA2.id) === 800000, "Transfer did not credit destination.");
  const { error: deleteTransferError } = await userA.client.rpc("delete_transaction_and_rebalance", {
    p_transaction_id: transferId,
    p_user_id: userA.id
  });
  if (deleteTransferError) throw deleteTransferError;
  assert(await balance(userA.client, accountA.id) === 1000000, "Deleting transfer did not restore source.");
  assert(await balance(userA.client, accountA2.id) === 500000, "Deleting transfer did not restore destination.");

  const { error: insufficientTransferError } = await userA.client.rpc("apply_transaction", {
    p_transaction_id: null,
    p_user_id: userA.id,
    p_type: "transfer",
    p_amount: 2000000,
    p_category: "Other",
    p_from_account_id: accountA.id,
    p_to_account_id: accountA2.id,
    p_transaction_date: new Date().toISOString().slice(0, 10),
    p_notes: "Must fail"
  });
  assert(insufficientTransferError, "Transfer was allowed to overdraw its source account.");
  assert(await balance(userA.client, accountA.id) === 1000000, "Failed transfer changed source balance.");
  assert(await balance(userA.client, accountA2.id) === 500000, "Failed transfer changed destination balance.");

  console.log("PASS: live RLS isolation and transaction balance checks succeeded.");
} finally {
  for (const userId of users) {
    await admin.auth.admin.deleteUser(userId);
  }
}
