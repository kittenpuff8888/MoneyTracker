import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppTopbar } from "@/components/layout/AppTopbar";
import type { Profile } from "@/lib/types";

export function DashboardShell({ profile, children }: { profile?: Profile | null; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-[1600px] overflow-hidden border-x border-border bg-background">
        <AppSidebar />
        <div className="min-w-0 flex-1">
          <AppTopbar name={profile?.full_name} email={profile?.email} avatarUrl={profile?.avatar_url} />
          <main className="p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
