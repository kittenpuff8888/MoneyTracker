import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { MobileNav } from "@/components/layout/MobileNav";
import type { Profile } from "@/lib/types";

export function DashboardShell({ profile, children }: { profile?: Profile | null; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-[1600px] overflow-hidden bg-background md:border-x md:border-border">
        <AppSidebar />
        <div className="min-w-0 flex-1">
          <AppTopbar name={profile?.full_name} email={profile?.email} avatarUrl={profile?.avatar_url} />
          <main className="p-4 pb-28 sm:p-5 sm:pb-28 md:p-6">{children}</main>
        </div>
      </div>
      <MobileNav />
    </div>
  );
}
