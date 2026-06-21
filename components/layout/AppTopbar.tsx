import Image from "next/image";
import Link from "next/link";
import { Bell, Plus, Search, Settings } from "lucide-react";
import { Button } from "@/components/ui/Button";

type AppTopbarProps = {
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
};

export function AppTopbar({ name, email, avatarUrl }: AppTopbarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/90 px-4 py-4 backdrop-blur md:px-6">
      <div className="flex items-center gap-3">
        <div className="relative hidden min-w-0 flex-1 md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} />
          <input
            placeholder="Search transactions, accounts, reports..."
            className="h-10 w-full rounded-lg border border-border bg-white pl-10 pr-4 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          />
        </div>
        <Link href="/transactions">
          <Button className="h-10">
            <Plus size={16} />
            <span className="hidden sm:inline">Add Transaction</span>
          </Button>
        </Link>
        <button aria-label="Notifications" className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-white text-muted-foreground">
          <Bell size={17} />
        </button>
        <Link href="/settings" aria-label="Settings" className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-white text-muted-foreground">
          <Settings size={17} />
        </Link>
        <div className="flex items-center gap-3 rounded-lg border border-border bg-white px-2 py-1.5">
          {avatarUrl ? (
            <Image src={avatarUrl} alt={name ?? "User avatar"} width={32} height={32} className="rounded-full" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">
              {(name ?? email ?? "U").slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="hidden max-w-40 truncate pr-1 text-xs sm:block">
            <p className="truncate font-semibold">{name ?? "Money Tracker User"}</p>
            <p className="truncate text-muted-foreground">{email}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
