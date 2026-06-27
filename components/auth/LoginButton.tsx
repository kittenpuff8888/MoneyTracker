"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

export function LoginButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    const next = new URLSearchParams(window.location.search).get("next");

    if (next?.startsWith("/") && !next.startsWith("//")) {
      callbackUrl.searchParams.set("next", next);
    }

    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl.toString()
      }
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
    }
  }

  return (
    <div className="w-full sm:w-auto">
      <Button onClick={signIn} disabled={loading} className="h-12 w-full px-6 sm:w-auto">
        <Mail size={18} />
        {loading ? "Opening Google..." : "Continue with Google"}
      </Button>
      {error ? <p className="mt-2 max-w-sm text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
