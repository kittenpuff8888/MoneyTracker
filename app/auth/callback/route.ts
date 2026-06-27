import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const requestedNext = requestUrl.searchParams.get("next");
  const next = requestedNext?.startsWith("/") && !requestedNext.startsWith("//")
    ? requestedNext
    : "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL("/?auth_error=missing_code", requestUrl.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/?auth_error=exchange_failed", requestUrl.origin));
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/?auth_error=user_missing", requestUrl.origin));
  }

  await supabase.from("profiles").upsert({
    id: user.id,
    email: user.email ?? null,
    full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
    avatar_url: user.user_metadata?.avatar_url ?? null
  });

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
