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

  const { error: profileError } = await supabase.rpc("sync_profile_from_auth");
  if (profileError) {
    return NextResponse.redirect(new URL("/?auth_error=profile_sync_failed", requestUrl.origin));
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
