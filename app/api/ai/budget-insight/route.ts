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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const period = new URL(request.url).searchParams.get("period") === "weekly" ? "weekly" : "monthly";
  const insight = await generateBudgetInsight(user.id, period);
  return NextResponse.json(insight);
}
