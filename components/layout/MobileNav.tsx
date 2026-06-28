"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CreditCard,
  Gauge,
  LineChart,
  Menu,
  PiggyBank,
  Plus,
  Settings,
  WalletCards,
  X
} from "lucide-react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { UserGuideButton } from "@/components/guide/UserGuideButton";
import { useAddTransaction } from "@/components/transactions/AddTransactionModal";
import { cn } from "@/lib/utils";

const primaryItems = [
  { href: "/dashboard", label: "Home", icon: Gauge },
  { href: "/transactions", label: "Transactions", icon: CreditCard },
  { href: "/budget", label: "Budget", icon: PiggyBank },
  { href: "/accounts", label: "Wallet", icon: WalletCards }
];

const moreItems = [
  { href: "/equity", label: "Investment Portfolio", icon: LineChart },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings }
];

function MobileFAB() {
  const { open } = useAddTransaction();
  return (
    <button
      type="button"
      aria-label="Add transaction"
      onClick={open}
      className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-4 z-30 grid h-14 w-14 place-items-center rounded-full bg-foreground text-card shadow-lg md:hidden"
    >
      <Plus size={24} />
    </button>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMoreOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  return (
    <>
      <UserGuideButton variant="floating" />
      <MobileFAB />

      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-2 pt-2 backdrop-blur md:hidden"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-medium transition-colors",
                  active
                    ? "bg-foreground/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon size={18} />
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            aria-expanded={moreOpen}
            aria-controls="mobile-more-menu"
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-medium transition-colors",
              moreOpen ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Menu size={18} />
            More
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMoreOpen(false)}
            className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
          />
          <section
            id="mobile-more-menu"
            role="dialog"
            aria-modal="true"
            aria-label="More navigation"
            className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-border bg-card px-4 pb-6 pt-4 shadow-2xl"
            style={{ paddingBottom: "max(1.5rem, calc(1rem + env(safe-area-inset-bottom)))" }}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">More</h2>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMoreOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
              >
                <X size={19} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {moreItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className="flex min-h-14 items-center gap-3 rounded-xl border border-border bg-muted px-3 text-sm font-medium transition hover:bg-border"
                  >
                    <Icon size={18} className="text-primary" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
            <div className="mt-4 border-t border-border pt-4">
              <LogoutButton />
            </div>
          </section>
        </div>
      )}
    </>
  );
}
