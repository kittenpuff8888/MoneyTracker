import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { MobileNav } from "@/components/layout/MobileNav";
import { AddTransactionProvider } from "@/components/transactions/AddTransactionModal";
import type { Profile } from "@/lib/types";

export function DashboardShell({
  profile,
  children
}: {
  profile?: Profile | null;
  children: React.ReactNode;
}) {
  return (
    /* Provider wraps everything so the sidebar button + mobile FAB can open the modal */
    <AddTransactionProvider>
      <div
        style={{ background: "var(--frame)", color: "var(--text)" }}
        className="min-h-screen p-0 md:p-3.5"
      >
        <div
          className="mx-auto flex min-h-[calc(100vh-1.75rem)] max-w-[1560px] items-stretch"
          style={{
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: "var(--shellR)",
            boxShadow: "0 4px 24px rgba(11,14,20,.06)"
          }}
        >
          <AppSidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <AppTopbar name={profile?.full_name} email={profile?.email} avatarUrl={profile?.avatar_url} payDay={profile?.pay_day} />
            <main className="flex-1 px-4 pb-28 pt-5 sm:px-6 md:px-[30px] md:pb-16 md:pt-6">
              {children}
            </main>
          </div>
        </div>
        <MobileNav />
      </div>
    </AddTransactionProvider>
  );
}
