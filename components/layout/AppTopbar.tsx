import Image from "next/image";
import Link from "next/link";
import { Bell, Plus, Search, Settings } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/Button";

type AppTopbarProps = {
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
};

export function AppTopbar({ name, email, avatarUrl }: AppTopbarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:px-6 md:py-4">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2 md:hidden">
          <BrandMark size={38} />
          <span className="truncate text-sm font-bold">8888 Tracker</span>
        </Link>
        <div className="relative hidden min-w-0 flex-1 xl:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} />
          <input
            placeholder="Search transactions, accounts, reports..."
            className="h-10 w-full rounded-lg border border-border bg-white pl-10 pr-4 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          />
        </div>
        <div className="flex-1 xl:hidden" />
        <Link href="/transactions" className="hidden md:block">
          <Button className="h-10">
            <Plus size={16} />
            <span className="hidden sm:inline">Add Transaction</span>
          </Button>
        </Link>
        <button aria-label="Notifications" className="hidden h-10 w-10 items-center justify-center rounded-lg border border-border bg-white text-muted-foreground lg:flex">
          <Bell size={17} />
        </button>
        <Link href="/settings" aria-label="Settings" className="hidden h-10 w-10 items-center justify-center rounded-lg border border-border bg-white text-muted-foreground lg:flex">
          <Settings size={17} />
        </Link>
        <Link href="/settings" aria-label="Open profile settings" className="flex items-center gap-3 rounded-lg border border-border bg-white px-1.5 py-1.5 sm:px-2">
          {avatarUrl ? (
            <Image src={avatarUrl} alt={name ?? "User avatar"} width={32} height={32} className="rounded-full" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">
              {(name ?? email ?? "U").slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="hidden max-w-40 truncate pr-1 text-xs lg:block">
            <p className="truncate font-semibold">{name ?? "8888 Tracker User"}</p>
            <p className="truncate text-muted-foreground">{email}</p>
          </div>
        </Link>
      </div>
    </header>
  );
}
