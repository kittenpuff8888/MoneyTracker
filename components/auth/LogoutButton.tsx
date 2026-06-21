"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/");
  }

  return (
    <Button onClick={logout} variant={compact ? "ghost" : "secondary"} className={compact ? "w-full justify-start px-3" : ""}>
      <LogOut size={16} />
      Logout
    </Button>
  );
}
