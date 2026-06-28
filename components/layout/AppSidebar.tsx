"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAddTransaction } from "@/components/transactions/AddTransactionModal";

type NavDef = { href: string; label: string; badge?: string | null; paths: string[] };

const overview: NavDef[] = [
  { href: "/dashboard", label: "Dashboard", paths: ["M3 13h8V3H3z", "M13 21h8V11h-8z", "M3 21h8v-6H3z", "M13 9h8V3h-8z"] },
  { href: "/transactions", label: "Transactions", paths: ["M3 6h18", "M7 12h10", "M10 18h4"] },
  { href: "/accounts", label: "Wallet", paths: ["M3 7h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H3z", "M3 7V5h13", "M17 13h.01"] },
  { href: "/equity", label: "Investment Portfolio", paths: ["M3 17l6-6 4 4 7-8", "M21 7h-4", "M21 7v4"] },
  { href: "/budget", label: "Budgets", paths: ["M21 12a9 9 0 1 1-9-9", "M21 3v9h-9"] }
];

function Ic({ paths, size = 18 }: { paths: string[]; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

function NavRow({ item, active, badge }: { item: NavDef; active: boolean; badge?: string | null }) {
  return (
    <Link
      href={item.href}
      className="flex items-center gap-[11px] rounded-[11px] px-[11px] py-[9px] transition-colors"
      style={{ color: active ? "var(--text)" : "var(--muted)", background: active ? "var(--soft)" : "transparent" }}
    >
      <Ic paths={item.paths} />
      <span className="text-[13px] font-semibold tracking-[.005em]">{item.label}</span>
      {badge ? (
        <span
          className="num ml-auto rounded-full px-[7px] py-px text-[10px] font-semibold"
          style={{ color: "var(--accent)", background: "var(--accentSoft)" }}
        >
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

function AddTransactionButton() {
  const { open } = useAddTransaction();
  return (
    <button
      type="button"
      onClick={() => open()}
      className="mt-4 flex items-center justify-center gap-2 rounded-xl p-[11px] text-[13px] font-semibold transition hover:opacity-90"
      style={{ background: "var(--ink)", color: "var(--panel)" }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
      Add Transaction
    </button>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  return (
    <nav
      className="sticky top-3.5 hidden h-[calc(100vh-1.75rem)] w-[224px] shrink-0 flex-col self-start px-3.5 py-5 md:flex"
      style={{ borderRight: "1px solid var(--hair)" }}
    >
      {/* Brand */}
      <Link href="/dashboard" className="flex select-none items-center gap-[11px] px-1.5 pb-5 pt-0.5">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px]"
          style={{ background: "var(--ink)" }}
        >
          <span className="num text-[13px] font-bold tracking-[.02em]" style={{ color: "var(--panel)" }}>88</span>
        </span>
        <div className="leading-[1.1]">
          <div className="text-[14.5px] font-extrabold tracking-[-.01em]">8888 Tracker</div>
          <div className="mt-0.5 text-[9.5px] tracking-[.02em]" style={{ color: "var(--faint)" }}>Personal finance</div>
        </div>
      </Link>

      <div className="px-2 pb-2 pt-1.5 text-[9.5px] font-semibold tracking-[.13em]" style={{ color: "var(--faint)" }}>OVERVIEW</div>
      <div className="flex flex-col gap-[3px]">
        {overview.map((item) => (
          <NavRow
            key={item.href}
            item={item}
            active={isActive(item.href)}
            badge={item.badge}
          />
        ))}
      </div>

      <AddTransactionButton />

      <div className="flex-1" />

      <div className="px-2 pb-2 pt-1.5 text-[9.5px] font-semibold tracking-[.13em]" style={{ color: "var(--faint)" }}>ACCOUNT</div>
      <div className="flex flex-col gap-[3px]">
        <Link
          href="/settings"
          className="flex items-center gap-[11px] rounded-[11px] px-[11px] py-[9px] transition-colors"
          style={{
            color: isActive("/settings") ? "var(--text)" : "var(--muted)",
            background: isActive("/settings") ? "var(--soft)" : "transparent"
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 6.8 19.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 5 13.6H4.9a2 2 0 1 1 0-4H5a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 11 5h.1A1.6 1.6 0 0 0 12.4 3.6V3.5a2 2 0 1 1 4 0v.1A1.6 1.6 0 0 0 19.4 6" /></svg>
          <span className="text-[13px] font-semibold">Settings</span>
        </Link>
        <Link
          href="/reports"
          className="flex items-center gap-[11px] rounded-[11px] px-[11px] py-[9px] transition-colors"
          style={{ color: "var(--muted)" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 0 1 4.5 1.5c0 1.5-2 2-2 3" /><path d="M12 17h.01" /></svg>
          <span className="text-[13px] font-semibold">Help &amp; Guide</span>
        </Link>
      </div>
    </nav>
  );
}
