import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { generateBudgetInsight } from "@/lib/ai";
import { sendWeeklyReportEmail } from "@/lib/email";
import type { Database } from "@/lib/types";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const userAgent = request.headers.get("user-agent") ?? "";
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    const isVercelCron = userAgent.includes("vercel-cron/1.0");
    if (!isVercelCron && auth !== `Bearer ${cronSecret}`) {
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

  const { periodStart, periodEnd, weekRange } = getJakartaWeekRange(new Date());
  const results = [];

  for (const profile of profiles ?? []) {
    if (!profile.email) continue;

    if (profile.last_weekly_report_sent_at && isSameJakartaWeek(new Date(profile.last_weekly_report_sent_at), new Date())) {
      await supabase.from("email_report_logs").insert({
        user_id: profile.id,
        report_type: "weekly",
        period_start: periodStart,
        period_end: periodEnd,
        recipient_email: profile.email,
        status: "skipped",
        error_message: "Weekly report already sent for this Jakarta week.",
        attempts: 0
      });
      results.push({ userId: profile.id, sent: false, skipped: true });
      continue;
    }

    const [transactionsResult, subscriptionsResult, insight] = await Promise.all([
      supabase
        .from("transactions")
        .select("*")
        .eq("user_id", profile.id)
        .gte("transaction_date", periodStart)
        .lte("transaction_date", periodEnd),
      supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", profile.id)
        .gte("billing_date", toJakartaDateString(new Date()))
        .limit(5),
      generateBudgetInsight(profile.id, "weekly")
    ]);

    const transactions = transactionsResult.data ?? [];
    const income = transactions.filter((item) => item.type === "income").reduce((sum, item) => sum + Number(item.amount), 0);
    const outcome = transactions.filter((item) => item.type === "outcome").reduce((sum, item) => sum + Number(item.amount), 0);
    const subscriptionsDue = (subscriptionsResult.data ?? []).map((item) => ({ name: item.name, amount: Number(item.amount) }));

    const delivery = await sendWeeklyReportWithRetry({
      to: profile.email,
      name: profile.full_name ?? profile.email,
      weekRange,
      income,
      outcome,
      netSaved: income - outcome,
      subscriptionsDue,
      insight
    });

    await supabase.from("email_report_logs").insert({
      user_id: profile.id,
      report_type: "weekly",
      period_start: periodStart,
      period_end: periodEnd,
      recipient_email: profile.email,
      status: delivery.status,
      error_message: delivery.errorMessage,
      resend_id: delivery.resendId,
      attempts: delivery.attempts,
      sent_at: delivery.status === "sent" ? new Date().toISOString() : null
    });

    if (delivery.status === "sent") {
      await supabase
        .from("profiles")
        .update({ last_weekly_report_sent_at: new Date().toISOString() })
        .eq("id", profile.id);
    }

    results.push({ userId: profile.id, sent: delivery.status === "sent", status: delivery.status, attempts: delivery.attempts });
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}

async function sendWeeklyReportWithRetry(
  payload: Parameters<typeof sendWeeklyReportEmail>[0],
  maxAttempts = 3
) {
  let errorMessage: string | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const result = await sendWeeklyReportEmail(payload);
      if ("skipped" in result) {
        return {
          status: "skipped" as const,
          attempts: attempt,
          resendId: null,
          errorMessage: result.reason
        };
      }

      if (result.error) {
        errorMessage = result.error.message;
      } else {
        return {
          status: "sent" as const,
          attempts: attempt,
          resendId: result.data?.id ?? null,
          errorMessage: null
        };
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Unknown email delivery error.";
    }
  }

  return {
    status: "failed" as const,
    attempts: maxAttempts,
    resendId: null,
    errorMessage
  };
}

function getJakartaWeekRange(now: Date) {
  const jakartaNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const day = jakartaNow.getUTCDay();
  const mondayOffset = (day + 6) % 7;
  const start = new Date(Date.UTC(jakartaNow.getUTCFullYear(), jakartaNow.getUTCMonth(), jakartaNow.getUTCDate() - mondayOffset));
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + 6));

  return {
    periodStart: formatDateOnly(start),
    periodEnd: formatDateOnly(end),
    weekRange: `${formatDisplayDate(start)} - ${formatDisplayDate(end)} WIB`
  };
}

function isSameJakartaWeek(a: Date, b: Date) {
  return getJakartaWeekRange(a).periodStart === getJakartaWeekRange(b).periodStart;
}

function toJakartaDateString(date: Date) {
  return formatDateOnly(new Date(date.getTime() + 7 * 60 * 60 * 1000));
}

function formatDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDisplayDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}
