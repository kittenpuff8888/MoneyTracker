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
import { useAddTransaction } from "@/components/transactions/AddTransactionModal";
import { cn } from "@/lib/utils";

const overview = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/transactions", label: "Transactions", icon: ArrowRightLeft },
  { href: "/accounts", label: "Wallet", icon: WalletCards },
  { href: "/equity", label: "Investment Portfolio", icon: TrendingUp },
  { href: "/budget", label: "Budgets", icon: PieChart }
];

const accountNav = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/reports", label: "Help & Guide", icon: HelpCircle }
];

function NavItem({ item }: { item: { href: string; label: string; icon: typeof LayoutGrid } }) {
  const pathname = usePathname();
  const Icon = item.icon;
  const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
  return (
    <Link
      href={item.href}
      className={cn(
        "flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
        active
          ? "bg-foreground text-card"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon size={17} />
      {item.label}
    </Link>
  );
}

function AddTransactionButton() {
  const { open } = useAddTransaction();
  return (
    <button
      type="button"
      onClick={open}
      className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 text-sm font-semibold text-card transition hover:opacity-90"
    >
      <Plus size={15} />
      Add Transaction
    </button>
  );
}

export function AppSidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col overflow-y-auto border-r border-border px-3 py-5 md:flex xl:w-64 xl:px-4">
      {/* Logo */}
      <Link href="/dashboard" className="mb-7 flex items-center gap-3 px-1">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-foreground text-sm font-bold tracking-tight text-card">
          88
        </span>
        <div className="min-w-0">
          <p className="text-[14px] font-bold leading-tight tracking-tight">8888 Tracker</p>
          <p className="text-[11px] text-muted-foreground">Personal finance</p>
        </div>
      </Link>

      {/* Overview nav */}
      <p className="eyebrow mb-2 px-2">Overview</p>
      <nav className="space-y-0.5">
        {overview.map((item) => <NavItem key={item.href} item={item} />)}
      </nav>

      {/* Add Transaction trigger — uses context from AddTransactionProvider */}
      <AddTransactionButton />

      {/* Account nav */}
      <p className="eyebrow mb-2 mt-7 px-2">Account</p>
      <nav className="space-y-0.5">
        {accountNav.map((item) => <NavItem key={item.href} item={item} />)}
      </nav>

      <div className="mt-auto pt-6">
        <LogoutButton compact />
      </div>
    </aside>
  );
}
