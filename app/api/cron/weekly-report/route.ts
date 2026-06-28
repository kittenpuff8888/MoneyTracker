import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { generateBudgetInsight } from "@/lib/ai";
import { sendWeeklyReportEmail } from "@/lib/email";
import type { Database } from "@/lib/types";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET is required." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const auth = request.headers.get("authorization") ?? "";
  if (!safeEqual(auth, `Bearer ${cronSecret}`)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Supabase service role is required for cron." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
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

  if (error) {
    return NextResponse.json(
      { error: "Unable to load report recipients." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }

  const results = [];

  for (const profile of profiles ?? []) {
    if (!profile.email) continue;

    const ctx = getReportContext(profile, new Date());
    if (!ctx) {
      results.push({ userId: profile.id, sent: false, skipped: true, reason: "not scheduled today" });
      continue;
    }
    const { periodStart, periodEnd, weekRange, reportType } = ctx;
    const insightPeriod = reportType === "monthly" ? "monthly" : "weekly";

    const { data: existingDelivery } = await supabase
      .from("email_report_logs")
      .select("id,status")
      .eq("user_id", profile.id)
      .eq("report_type", reportType)
      .eq("period_start", periodStart)
      .in("status", ["processing", "sent"])
      .limit(1)
      .maybeSingle();

    if (existingDelivery) {
      results.push({ userId: profile.id, sent: existingDelivery.status === "sent", skipped: true });
      continue;
    }

    const { data: claim, error: claimError } = await supabase
      .from("email_report_logs")
      .insert({
        user_id: profile.id,
        report_type: reportType,
        period_start: periodStart,
        period_end: periodEnd,
        recipient_email: profile.email,
        status: "processing",
        attempts: 0,
        sent_at: null
      })
      .select("id")
      .single();

    if (claimError || !claim) {
      results.push({ userId: profile.id, sent: false, skipped: claimError?.code === "23505" });
      continue;
    }

    try {
      const subscriptionsEnd = toJakartaDateString(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
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
          .lte("billing_date", subscriptionsEnd)
          .limit(5),
        generateBudgetInsight(supabase, profile.id, insightPeriod)
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

      await supabase.from("email_report_logs").update({
        status: delivery.status,
        error_message: delivery.errorMessage,
        resend_id: delivery.resendId,
        attempts: delivery.attempts,
        sent_at: delivery.status === "sent" ? new Date().toISOString() : null
      }).eq("id", claim.id);

      if (delivery.status === "sent") {
        await supabase
          .from("profiles")
          .update({ last_weekly_report_sent_at: new Date().toISOString() })
          .eq("id", profile.id);
      }

      results.push({ userId: profile.id, sent: delivery.status === "sent", status: delivery.status, attempts: delivery.attempts });
    } catch (deliveryError) {
      await supabase.from("email_report_logs").update({
        status: "failed",
        error_message: deliveryError instanceof Error ? deliveryError.message : "Unhandled report error.",
        attempts: 1,
        sent_at: null
      }).eq("id", claim.id);
      results.push({ userId: profile.id, sent: false, status: "failed" });
    }
  }

  return NextResponse.json(
    { ok: true, processed: results.length, results },
    { headers: { "Cache-Control": "no-store" } }
  );
}

function safeEqual(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
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

const WEEKDAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

type ReportContext = {
  reportType: "daily" | "weekly" | "monthly";
  periodStart: string;
  periodEnd: string;
  weekRange: string;
};

// Decide whether a report is due for this profile *today* (Asia/Jakarta), and
// the period it should cover. Returns null when nothing is scheduled today.
function getReportContext(profile: { report_frequency?: string | null; report_day?: string | null }, now: Date): ReportContext | null {
  const frequency = (profile.report_frequency ?? "weekly").toLowerCase();
  const jakartaNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);

  if (frequency === "daily") {
    const start = new Date(Date.UTC(jakartaNow.getUTCFullYear(), jakartaNow.getUTCMonth(), jakartaNow.getUTCDate()));
    return {
      reportType: "daily",
      periodStart: formatDateOnly(start),
      periodEnd: formatDateOnly(start),
      weekRange: `${formatDisplayDate(start)} WIB`
    };
  }

  if (frequency === "monthly") {
    const wantDom = Math.min(Math.max(Number(profile.report_day ?? "1") || 1, 1), 28);
    if (jakartaNow.getUTCDate() !== wantDom) return null;
    const start = new Date(Date.UTC(jakartaNow.getUTCFullYear(), jakartaNow.getUTCMonth(), 1));
    const end = new Date(Date.UTC(jakartaNow.getUTCFullYear(), jakartaNow.getUTCMonth(), jakartaNow.getUTCDate()));
    return {
      reportType: "monthly",
      periodStart: formatDateOnly(start),
      periodEnd: formatDateOnly(end),
      weekRange: `${formatDisplayDate(start)} - ${formatDisplayDate(end)} WIB`
    };
  }

  // weekly (default)
  const wantDay = (profile.report_day ?? "sunday").toLowerCase();
  if (WEEKDAY_NAMES[jakartaNow.getUTCDay()] !== wantDay) return null;
  const week = getJakartaWeekRange(now);
  return {
    reportType: "weekly",
    periodStart: week.periodStart,
    periodEnd: week.periodEnd,
    weekRange: week.weekRange
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
