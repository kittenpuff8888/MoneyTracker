"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import {
  Download,
  Eye,
  EyeOff,
  Moon,
  Sun,
  Languages,
  Calendar,
  Search,
  X
} from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";

type AppTopbarProps = {
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
};

function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}

function presets() {
  const now = new Date();
  const som = new Date(now.getFullYear(), now.getMonth(), 1);
  const eom = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const last30 = new Date(now); last30.setDate(last30.getDate() - 29);
  const soy = new Date(now.getFullYear(), 0, 1);
  return [
    { key: "month", label: "Month", from: fmt(som), to: fmt(eom) },
    { key: "30d", label: "30d", from: fmt(last30), to: fmt(now) },
    { key: "year", label: "Year", from: fmt(soy), to: fmt(now) }
  ];
}

export function AppTopbar({ name, email, avatarUrl }: AppTopbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [dark, setDark] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [lang, setLang] = useState<"ID" | "EN">("ID");
  const [search, setSearch] = useState("");
  const [calOpen, setCalOpen] = useState(false);

  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);

  // Sync date inputs when URL params change
  useEffect(() => {
    setCustomFrom(from);
    setCustomTo(to);
  }, [from, to]);

  // Dark mode — toggle class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  // Hide balances — toggle class on <body>
  useEffect(() => {
    document.body.classList.toggle("balances-hidden", hidden);
  }, [hidden]);

  // Live search — push to current page with q param
  const doSearch = useCallback((value: string) => {
    setSearch(value);
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (value) params.set("q", value);
    else params.delete("q");
    router.push(`${pathname}?${params.toString()}`);
  }, [router, pathname, searchParams]);

  function applyRange(f: string, t: string) {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (f) params.set("from", f);
    if (t) params.set("to", t);
    router.push(`${pathname}?${params.toString()}`);
    setCalOpen(false);
  }

  function exportCSV() {
    // Trigger browser print as simple export; a real CSV would need a server action
    window.print();
  }

  const ps = presets();

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card/95 px-4 py-2.5 backdrop-blur md:px-5">
      <div className="flex items-center gap-2">
        {/* Mobile logo */}
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2 md:hidden">
          <BrandMark size={32} />
          <span className="truncate text-sm font-bold tracking-tight">8888 Tracker</span>
        </Link>

        {/* Search */}
        <div className="relative hidden min-w-0 flex-1 md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
          <input
            value={search}
            onChange={(e) => doSearch(e.target.value)}
            placeholder="Search transactions…"
            className="h-9 w-full max-w-xs rounded-lg border border-border bg-muted pl-8 pr-8 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/30"
          />
          {search && (
            <button
              type="button"
              onClick={() => doSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex-1 md:hidden" />

        {/* Date range picker */}
        <div className="relative hidden lg:block">
          <button
            type="button"
            onClick={() => setCalOpen((v) => !v)}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-muted px-3 text-xs font-medium text-muted-foreground transition hover:text-foreground"
          >
            <Calendar size={13} />
            {from && to ? `${from} → ${to}` : "Date range"}
          </button>

          {calOpen && (
            <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border border-border bg-card p-4 shadow-xl">
              <div className="mb-3 flex gap-1.5">
                {ps.map((p) => {
                  const active = p.from === from && p.to === to;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => applyRange(p.from, p.to)}
                      className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition ${
                        active
                          ? "bg-foreground text-card"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                  From
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="h-8 rounded-lg border border-border bg-muted px-2 text-xs outline-none focus:border-primary"
                  />
                </label>
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                  To
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="h-8 rounded-lg border border-border bg-muted px-2 text-xs outline-none focus:border-primary"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={() => applyRange(customFrom, customTo)}
                className="mt-3 w-full rounded-lg bg-foreground py-2 text-xs font-semibold text-card transition hover:opacity-90"
              >
                Apply
              </button>
            </div>
          )}
        </div>

        {/* Icon buttons */}
        <button
          type="button"
          aria-label="Export"
          onClick={exportCSV}
          title="Export / Print"
          className="icon-btn"
        >
          <Download size={16} />
        </button>

        <button
          type="button"
          aria-label={hidden ? "Show balances" : "Hide balances"}
          onClick={() => setHidden((v) => !v)}
          title={hidden ? "Show balances" : "Hide balances"}
          className="icon-btn"
        >
          {hidden ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>

        <button
          type="button"
          aria-label="Toggle dark mode"
          onClick={() => setDark((v) => !v)}
          title={dark ? "Light mode" : "Dark mode"}
          className="icon-btn"
        >
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <button
          type="button"
          aria-label="Toggle language"
          onClick={() => setLang((v) => (v === "ID" ? "EN" : "ID"))}
          title="Toggle language"
          className="icon-btn gap-1 px-2 text-xs font-semibold"
        >
          <Languages size={14} />
          {lang}
        </button>

        {/* Avatar */}
        <Link
          href="/settings"
          aria-label="Open profile settings"
          className="flex items-center gap-2 rounded-xl border border-border bg-muted px-1.5 py-1 transition hover:bg-border"
        >
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={name ?? "User avatar"}
              width={30}
              height={30}
              className="rounded-full"
            />
          ) : (
            <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-foreground text-xs font-bold text-card">
              {(name ?? email ?? "U").slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="hidden max-w-32 truncate pr-1 text-xs lg:block">
            <p className="truncate font-semibold">{name ?? "8888 User"}</p>
            <p className="truncate text-muted-foreground">{email}</p>
          </div>
        </Link>
      </div>

      {/* Mobile search row */}
      <div className="mt-2 md:hidden">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
          <input
            value={search}
            onChange={(e) => doSearch(e.target.value)}
            placeholder="Search transactions…"
            className="h-9 w-full rounded-lg border border-border bg-muted pl-8 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
      </div>
    </header>
  );
}
