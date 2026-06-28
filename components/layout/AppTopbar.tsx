import Image from "next/image";
import Link from "next/link";
import { Search, Settings } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";

type AppTopbarProps = {
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
};

export function AppTopbar({ name, email, avatarUrl }: AppTopbarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-[#fbfcfd]/95 px-4 py-3 backdrop-blur md:px-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2 md:hidden">
          <BrandMark size={34} />
          <span className="truncate text-sm font-bold tracking-tight">8888 Tracker</span>
        </Link>
        <div className="relative hidden min-w-0 flex-1 md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            placeholder="Search transactions..."
            className="h-10 w-full max-w-md rounded-lg border border-border bg-white pl-9 pr-4 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div className="flex-1 md:hidden" />
        <Link
          href="/settings"
          aria-label="Settings"
          className="hidden h-10 w-10 items-center justify-center rounded-lg border border-border bg-white text-muted-foreground hover:text-foreground lg:flex"
        >
          <Settings size={17} />
        </Link>
        <Link
          href="/settings"
          aria-label="Open profile settings"
          className="flex items-center gap-2.5 rounded-lg border border-border bg-white px-1.5 py-1.5 sm:px-2"
        >
          {avatarUrl ? (
            <Image src={avatarUrl} alt={name ?? "User avatar"} width={32} height={32} className="rounded-full" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0b0e14] text-xs font-bold text-white">
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
