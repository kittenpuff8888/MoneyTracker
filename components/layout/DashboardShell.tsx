import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { MobileNav } from "@/components/layout/MobileNav";
import type { Profile } from "@/lib/types";

export function DashboardShell({
  profile,
  children
}: {
  profile?: Profile | null;
  children: React.ReactNode;
}) {
  return (
    /* Outer frame — light gray background from :root --background */
    <div className="min-h-screen bg-background p-0 md:p-3">
      {/* Inner shell — white/card rounded container */}
      <div
        className="mx-auto flex min-h-screen md:min-h-[calc(100vh-1.5rem)] max-w-[1600px] overflow-hidden bg-card shadow-[0_0_0_1px_hsl(var(--border))]"
        style={{ borderRadius: "var(--shell-radius)" }}
      >
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppTopbar name={profile?.full_name} email={profile?.email} avatarUrl={profile?.avatar_url} />
          <main className="flex-1 overflow-auto p-4 pb-28 sm:p-5 sm:pb-28 md:p-6">
            {children}
          </main>
        </div>
      </div>
      <MobileNav />
    </div>
  );
}
