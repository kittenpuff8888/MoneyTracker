"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BellRing,
  CreditCard,
  Gauge,
  LineChart,
  PiggyBank,
  Settings,
  WalletCards
} from "lucide-react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { BrandMark } from "@/components/brand/BrandMark";
import { UserGuideButton } from "@/components/guide/UserGuideButton";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/accounts", label: "Wallet", icon: WalletCards },
  { href: "/transactions", label: "Transactions", icon: CreditCard },
  { href: "/budget", label: "Budget", icon: PiggyBank },
  { href: "/equity", label: "Investment Portfolio", icon: LineChart },
  { href: "/reports", label: "Reports", icon: BellRing },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 overflow-y-auto border-r border-border bg-white px-3 py-5 md:flex md:flex-col xl:w-72 xl:px-4">
      <Link href="/dashboard" className="mb-8 flex items-center gap-3 px-2">
        <BrandMark size={42} />
        <div>
          <p className="text-lg font-bold">8888 Tracker</p>
          <p className="max-w-40 text-xs leading-4 text-muted-foreground">Where Prosperity will Find you.</p>
        </div>
      </Link>

      <nav className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              className={cn(
                "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition",
                active && "bg-sky-100 text-sky-700",
                !active && "hover:bg-sky-50 hover:text-foreground"
              )}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-4 pt-6">
        <div className="hidden rounded-lg border border-sky-100 bg-sky-50 p-4 xl:block">
          <p className="text-sm font-semibold">Weekly Reports</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Automated IDR summaries can be sent from Vercel Cron through Resend.
          </p>
        </div>
        <UserGuideButton variant="sidebar" />
        <LogoutButton compact />
      </div>
    </aside>
  );
}
