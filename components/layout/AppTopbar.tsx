"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { payPeriodRange } from "@/lib/pay-period";

type AppTopbarProps = {
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  payDay?: number | null;
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function parse(s: string | null): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function AppTopbar({ name, email, avatarUrl, payDay }: AppTopbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [dark, setDark] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [rangeOpen, setRangeOpen] = useState(false);
  const rangeRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const urlFrom = parse(searchParams.get("from"));
  const urlTo = parse(searchParams.get("to"));
  // Default range = the current pay cycle (from the user's pay day to today)
  const payCycle = payPeriodRange(payDay, now);
  const from = urlFrom ?? payCycle.from;
  const to = urlTo ?? payCycle.to;

  const [calY, setCalY] = useState(from.getFullYear());
  const [calM, setCalM] = useState(from.getMonth());

  // hydrate persisted theme + hide-balances state
  useEffect(() => {
    const t = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
    setDark(t === "dark");
    setHidden(typeof window !== "undefined" && localStorage.getItem("hideBalances") === "1");
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, [dark]);
  useEffect(() => {
    document.documentElement.classList.toggle("balances-hidden", hidden);
  }, [hidden]);

  // close range popover on outside click
  useEffect(() => {
    if (!rangeOpen) return;
    const onDown = (e: MouseEvent) => {
      if (rangeRef.current && !rangeRef.current.contains(e.target as Node)) setRangeOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [rangeOpen]);

  const rangeLabel = useMemo(() => {
    const sameYear = from.getFullYear() === to.getFullYear();
    const sameMonth = sameYear && from.getMonth() === to.getMonth();
    if (sameMonth) return `${from.getDate()}–${to.getDate()} ${MONTHS_SHORT[to.getMonth()]} ${to.getFullYear()}`;
    return `${from.getDate()} ${MONTHS_SHORT[from.getMonth()]} – ${to.getDate()} ${MONTHS_SHORT[to.getMonth()]} ${to.getFullYear()}`;
  }, [from, to]);

  function applyRange(f: Date, t: Date) {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.set("from", ymd(f));
    params.set("to", ymd(t));
    router.push(`${pathname}?${params.toString()}`);
  }

  function submitSearch(value: string) {
    setSearch(value);
    const params = new URLSearchParams();
    if (value) params.set("q", value);
    router.push(`/transactions${value ? `?${params.toString()}` : ""}`);
  }

  // calendar cells for displayed month
  const cells = useMemo(() => {
    const first = new Date(calY, calM, 1).getDay();
    const days = new Date(calY, calM + 1, 0).getDate();
    const out: (number | null)[] = [];
    for (let i = 0; i < first; i++) out.push(null);
    for (let d = 1; d <= days; d++) out.push(d);
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [calY, calM]);

  function pickDay(d: number) {
    const picked = new Date(calY, calM, d);
    // two-click range: if a full range exists, start over; else extend
    if (from && to && ymd(from) !== ymd(to)) {
      applyRange(picked, picked);
    } else if (picked >= from) {
      applyRange(from, picked);
    } else {
      applyRange(picked, from);
    }
  }

  function preset(kind: "month" | "14d" | "7d") {
    const t = new Date();
    if (kind === "month") {
      // "This month" = the current pay cycle (pay day → today)
      const pc = payPeriodRange(payDay, t);
      applyRange(pc.from, pc.to);
    } else {
      const days = kind === "14d" ? 13 : 6;
      const f = new Date(t); f.setDate(f.getDate() - days);
      applyRange(f, t);
    }
  }

  const inRange = (d: number) => {
    const day = new Date(calY, calM, d);
    return day >= new Date(from.getFullYear(), from.getMonth(), from.getDate()) &&
      day <= new Date(to.getFullYear(), to.getMonth(), to.getDate());
  };
  const isEnd = (d: number) => {
    const s = ymd(new Date(calY, calM, d));
    return s === ymd(from) || s === ymd(to);
  };

  const iconBtn = "flex h-[34px] w-[34px] items-center justify-center rounded-lg cursor-pointer transition-colors";
  const iconBtnStyle = { border: "1px solid var(--border)", color: "var(--muted)" };

  return (
    <header
      className="sticky top-0 z-40 md:top-3.5"
      style={{ background: "var(--panel)", borderBottom: "1px solid var(--hair)", borderRadius: "0 var(--shellR) 0 0" }}
    >
      <div className="flex flex-wrap items-center gap-[14px] px-4 py-[13px] md:px-[22px]">
        {/* Search */}
        <div className="relative min-w-[160px] flex-1 md:max-w-[380px]">
          <div className="flex items-center gap-2 rounded-[10px] px-[11px] py-[7px]" style={{ background: "var(--soft)", border: "1px solid var(--border)" }}>
            <span style={{ color: "var(--faint)" }} className="text-[13px]">⌕</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submitSearch(search); }}
              placeholder="Search transactions…"
              className="w-full border-none bg-transparent text-[13px] outline-none"
              style={{ color: "var(--text)" }}
            />
          </div>
        </div>

        <div className="hidden flex-1 md:block" />

        {/* Date range */}
        <div className="relative" ref={rangeRef}>
          <button
            type="button"
            onClick={() => setRangeOpen((v) => !v)}
            className="num flex items-center gap-2 rounded-[9px] px-[11px] py-1.5 text-[12px] font-semibold"
            style={{ border: "1px solid var(--border)", color: "var(--text)" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18M8 2v4M16 2v4" /></svg>
            {rangeLabel}<span className="text-[9px]" style={{ color: "var(--faint)" }}>▾</span>
          </button>

          {rangeOpen && (
            <div
              className="animate-fadein absolute right-0 top-[42px] z-[60] w-[288px] rounded-[14px] p-4"
              style={{ background: "var(--panel)", border: "1px solid var(--border)", boxShadow: "0 16px 40px rgba(11,14,20,.18)" }}
            >
              <div className="mb-3 flex gap-1.5">
                {([["month", "This month"], ["14d", "Last 14d"], ["7d", "This week"]] as const).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => preset(id)}
                    className="flex-1 rounded-lg px-1 py-[7px] text-center text-[11px] font-semibold"
                    style={{ border: "1px solid var(--border)", color: "var(--text)" }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="mb-2.5 flex items-center justify-between">
                <span className="text-[14px] font-bold">{MONTHS[calM]} {calY}</span>
                <div className="flex gap-1.5">
                  <button type="button" onClick={() => { const m = calM - 1; if (m < 0) { setCalM(11); setCalY(calY - 1); } else setCalM(m); }} className="flex h-[26px] w-[26px] items-center justify-center rounded-[7px]" style={{ border: "1px solid var(--border)", color: "var(--muted)" }}>‹</button>
                  <button type="button" onClick={() => { const m = calM + 1; if (m > 11) { setCalM(0); setCalY(calY + 1); } else setCalM(m); }} className="flex h-[26px] w-[26px] items-center justify-center rounded-[7px]" style={{ border: "1px solid var(--border)", color: "var(--muted)" }}>›</button>
                </div>
              </div>
              <div className="mb-1 grid grid-cols-7 gap-0.5">
                {DOW.map((d) => <div key={d} className="py-1 text-center text-[10px] font-semibold" style={{ color: "var(--faint)" }}>{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {cells.map((d, i) => {
                  if (d === null) return <div key={i} className="aspect-square" />;
                  const end = isEnd(d);
                  const within = inRange(d);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => pickDay(d)}
                      className="num flex aspect-square items-center justify-center text-[11.5px]"
                      style={{
                        borderRadius: end ? "9px" : within ? "0" : "8px",
                        background: end ? "var(--ink)" : within ? "var(--accentSoft)" : "transparent",
                        color: end ? "var(--panel)" : within ? "var(--accent)" : "var(--text)",
                        fontWeight: end ? 700 : within ? 600 : 400
                      }}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Icon buttons */}
        <div className="flex items-center gap-1">
          <button type="button" title="Export / Print" onClick={() => window.print()} className={iconBtn} style={iconBtnStyle}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></svg>
          </button>

          <button
            type="button"
            title={hidden ? "Show balances" : "Hide balances"}
            onClick={() => { const v = !hidden; setHidden(v); localStorage.setItem("hideBalances", v ? "1" : "0"); }}
            className={iconBtn}
            style={{ border: "1px solid var(--border)", color: hidden ? "var(--accent)" : "var(--muted)" }}
          >
            {hidden ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20C5 20 1 12 1 12a18.5 18.5 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
            )}
          </button>

          <button
            type="button"
            title={dark ? "Light mode" : "Dark mode"}
            onClick={() => { const v = !dark; setDark(v); localStorage.setItem("theme", v ? "dark" : "light"); }}
            className={iconBtn}
            style={iconBtnStyle}
          >
            {dark ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><line x1="12" y1="2" x2="12" y2="4" /><line x1="12" y1="20" x2="12" y2="22" /><line x1="2" y1="12" x2="4" y2="12" /><line x1="20" y1="12" x2="22" y2="12" /><line x1="5" y1="5" x2="6.5" y2="6.5" /><line x1="17.5" y1="17.5" x2="19" y2="19" /><line x1="5" y1="19" x2="6.5" y2="17.5" /><line x1="17.5" y1="6.5" x2="19" y2="5" /></svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
            )}
          </button>

          {/* Avatar */}
          <Link href="/settings" aria-label="Open settings" className="flex h-[34px] w-[34px] items-center justify-center overflow-hidden rounded-full" style={{ background: "var(--ink)", color: "var(--panel)" }}>
            {avatarUrl ? (
              <Image src={avatarUrl} alt={name ?? "User"} width={34} height={34} className="rounded-full" />
            ) : (
              <span className="text-[12px] font-bold">{(name ?? email ?? "U").slice(0, 1).toUpperCase()}</span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
