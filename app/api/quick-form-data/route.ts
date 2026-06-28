import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ accounts: [], categories: [] }, { status: 401 });

  const [accountsResult, categoriesResult] = await Promise.all([
    supabase.from("accounts").select("id,name,type").eq("user_id", user.id).order("name"),
    supabase.from("transaction_categories").select("name").eq("user_id", user.id).order("name")
  ]);

  return NextResponse.json({
    accounts: accountsResult.data ?? [],
    categories: (categoriesResult.data ?? []).map((r) => r.name)
  });
}
