"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRightLeft,
  HelpCircle,
  LayoutGrid,
  PieChart,
  Plus,
  Settings,
  TrendingUp,
  WalletCards
} from "lucide-react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { cn } from "@/lib/utils";

const overview = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/transactions", label: "Transactions", icon: ArrowRightLeft },
  { href: "/accounts", label: "Wallet", icon: WalletCards },
  { href: "/equity", label: "Investment Portfolio", icon: TrendingUp },
  { href: "/budget", label: "Budgets", icon: PieChart }
];

const account = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/reports", label: "Help & Guide", icon: HelpCircle }
];

export function AppSidebar() {
  const pathname = usePathname();

  function NavItem({ item }: { item: { href: string; label: string; icon: typeof LayoutGrid } }) {
    const Icon = item.icon;
    const active = pathname === item.href;
    return (
      <Link
        href={item.href}
        className={cn(
          "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition",
          active
            ? "border border-border bg-white text-foreground shadow-card"
            : "text-muted-foreground hover:bg-white/70 hover:text-foreground"
        )}
      >
        <Icon size={18} className={active ? "text-blue-600" : ""} />
        {item.label}
      </Link>
    );
  }

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto border-r border-border bg-[#fbfcfd] px-3 py-5 md:flex xl:w-72 xl:px-4">
      <Link href="/dashboard" className="mb-7 flex items-center gap-3 px-1">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#0b0e14] text-sm font-bold tracking-tight text-white">88</span>
        <div className="min-w-0">
          <p className="text-[15px] font-bold leading-tight tracking-tight">8888 Tracker</p>
          <p className="text-xs text-muted-foreground">Personal finance</p>
        </div>
      </Link>

      <p className="eyebrow mb-2 px-2">Overview</p>
      <nav className="space-y-1">
        {overview.map((item) => (
          <NavItem key={item.href} item={item} />
        ))}
      </nav>

      <Link
        href="/transactions"
        className="mt-4 flex h-11 items-center justify-center gap-2 rounded-lg bg-[#0b0e14] px-4 text-sm font-semibold text-white transition hover:bg-[#1c2230]"
      >
        <Plus size={16} />
        Add Transaction
      </Link>

      <p className="eyebrow mb-2 mt-7 px-2">Account</p>
      <nav className="space-y-1">
        {account.map((item) => (
          <NavItem key={`${item.href}-${item.label}`} item={item} />
        ))}
      </nav>

      <div className="mt-auto pt-6">
        <LogoutButton compact />
      </div>
    </aside>
  );
}
