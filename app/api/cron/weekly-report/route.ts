import { endOfWeek, format, startOfWeek } from "date-fns";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { generateBudgetInsight } from "@/lib/ai";
import { sendWeeklyReportEmail } from "@/lib/email";
import type { Database } from "@/lib/types";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Supabase service role is required for cron." }, { status: 500 });
  }

  const supabase = createSupabaseJsClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("weekly_report_enabled", true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const weekRange = `${format(weekStart, "dd MMM yyyy")} - ${format(weekEnd, "dd MMM yyyy")}`;
  const results = [];

  for (const profile of profiles ?? []) {
    if (!profile.email) continue;
    const [transactionsResult, subscriptionsResult, insight] = await Promise.all([
      supabase
        .from("transactions")
        .select("*")
        .eq("user_id", profile.id)
        .gte("transaction_date", format(weekStart, "yyyy-MM-dd"))
        .lte("transaction_date", format(weekEnd, "yyyy-MM-dd")),
      supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", profile.id)
        .gte("billing_date", format(new Date(), "yyyy-MM-dd"))
        .limit(5),
      generateBudgetInsight(profile.id, "weekly")
    ]);

    const transactions = transactionsResult.data ?? [];
    const income = transactions.filter((item) => item.type === "income").reduce((sum, item) => sum + Number(item.amount), 0);
    const outcome = transactions.filter((item) => item.type === "outcome").reduce((sum, item) => sum + Number(item.amount), 0);
    const subscriptionsDue = (subscriptionsResult.data ?? []).map((item) => ({ name: item.name, amount: Number(item.amount) }));

    const sendResult = await sendWeeklyReportEmail({
      to: profile.email,
      name: profile.full_name ?? profile.email,
      weekRange,
      income,
      outcome,
      netSaved: income - outcome,
      subscriptionsDue,
      insight
    });

    results.push({ userId: profile.id, sent: !("skipped" in sendResult), result: sendResult });
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}
