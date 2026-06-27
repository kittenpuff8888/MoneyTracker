import { NextResponse } from "next/server";
import { generateBudgetInsight } from "@/lib/ai";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "private, no-store" } }
    );
  }

  const { data: quotaAllowed, error: quotaError } = await supabase.rpc("consume_ai_quota");
  if (quotaError) {
    return NextResponse.json(
      { error: "AI security migration is not active." },
      { status: 503, headers: { "Cache-Control": "private, no-store" } }
    );
  }
  if (!quotaAllowed) {
    return NextResponse.json(
      { error: "AI request limit reached. Try again later." },
      { status: 429, headers: { "Cache-Control": "private, no-store", "Retry-After": "3600" } }
    );
  }

  const period = new URL(request.url).searchParams.get("period") === "weekly" ? "weekly" : "monthly";
  const insight = await generateBudgetInsight(supabase, user.id, period);
  return NextResponse.json(insight, {
    headers: { "Cache-Control": "private, no-store" }
  });
}
