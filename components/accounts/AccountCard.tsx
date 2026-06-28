"use client";

import { Pencil } from "lucide-react";
import { ConfirmDeleteButton } from "@/components/ui/ConfirmDeleteButton";
import { deleteAccount } from "@/lib/actions/accounts";
import { formatIDR } from "@/lib/formatters";
import { getWalletIcon } from "@/lib/wallet-icons";
import type { Account } from "@/lib/types";

function compact(n: number) {
  const a = Math.abs(n);
  const s = a >= 1e9 ? `${(a / 1e9).toFixed(1)} M` : a >= 1e6 ? `${(a / 1e6).toFixed(1)} jt` : a >= 1e3 ? `${Math.round(a / 1e3)} rb` : `${Math.round(a)}`;
  return `Rp ${s}`;
}

function seed(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) + 7;
}
function rng(s: number) {
  let a = s >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/* Deterministic sparkline in the wallet's accent color (matches v2). */
function Sparkline({ name, up, color }: { name: string; up: boolean; color: string }) {
  const r = rng(seed(name));
  const drift = up ? 0.005 : -0.004;
  let v = 100;
  const series = [v];
  for (let i = 0; i < 23; i++) { v *= 1 + (r() - 0.5) * 0.05 + drift; series.push(v); }
  const w = 120, h = 32;
  const min = Math.min(...series), max = Math.max(...series), rng2 = max - min || 1;
  const pts = series.map((p, i) => `${((i / (series.length - 1)) * w).toFixed(1)},${(h - ((p - min) / rng2) * (h - 4) - 2).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: "block" }}>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill={color} opacity={0.12} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.7} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function AccountCard({
  account,
  income = 0,
  expense = 0,
  onEdit
}: {
  account: Account;
  income?: number;
  expense?: number;
  onEdit?: (account: Account) => void;
}) {
  const Icon = getWalletIcon(account.icon);
  const balance = Number(account.current_balance ?? 0);
  const color = account.color ?? "var(--accent)";
  const net = income - expense;
  const pctChange = balance !== 0 ? Math.max(-99, Math.min(99, (net / Math.abs(balance)) * 100)) : 0;
  const up = pctChange >= 0;
  const chgLabel = `${up ? "+" : "−"}${Math.abs(pctChange).toFixed(1)}%`;

  return (
    <div className="group relative p-[15px]" style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--r)", boxShadow: "var(--sh)" }}>
      <div className="mb-3.5 flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px]" style={{ background: `${color}22`, color }}>
            <Icon size={18} />
          </div>
          <div className="leading-[1.25]">
            <div className="text-[13.5px] font-bold">{account.name}</div>
            <div className="text-[10.5px]" style={{ color: "var(--faint)" }}>{account.type}</div>
          </div>
        </div>
        <span className="num rounded-[6px] px-2 py-[3px] text-[10.5px] font-bold" style={{ background: up ? "var(--upSoft)" : "var(--downSoft)", color: up ? "var(--up)" : "var(--down)" }}>{chgLabel}</span>
      </div>

      <div className="mb-3 flex items-end justify-between gap-2">
        <div>
          <div className="mb-[3px] text-[9.5px]" style={{ color: "var(--faint)" }}>BALANCE</div>
          <div className="num-balance num text-[21px] font-semibold leading-none">{compact(balance)}</div>
        </div>
        <div className="h-8 w-[84px]"><Sparkline name={account.name} up={up} color={typeof color === "string" && color.startsWith("#") ? color : "#2563eb"} /></div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 rounded-lg px-[9px] py-[7px]" style={{ background: "var(--soft)" }}>
          <div className="mb-0.5 text-[9px]" style={{ color: "var(--faint)" }}>INCOME</div>
          <div className="num text-[11.5px] font-semibold" style={{ color: "var(--up)" }}>{compact(income)}</div>
        </div>
        <div className="flex-1 rounded-lg px-[9px] py-[7px]" style={{ background: "var(--soft)" }}>
          <div className="mb-0.5 text-[9px]" style={{ color: "var(--faint)" }}>EXPENSE</div>
          <div className="num text-[11.5px] font-semibold" style={{ color: "var(--down)" }}>{compact(expense)}</div>
        </div>
      </div>

      {/* Hover actions */}
      <div className="mt-3 flex justify-end gap-1.5 opacity-0 transition group-hover:opacity-100">
        <button type="button" onClick={() => onEdit?.(account)} aria-label="Edit" className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ border: "1px solid var(--border)", color: "var(--muted)" }}>
          <Pencil size={13} />
        </button>
        <ConfirmDeleteButton compact itemName={account.name} successMessage="Wallet deleted." warningText="The wallet can only be deleted when no transactions reference it." onConfirm={() => deleteAccount(account.id)} />
      </div>
    </div>
  );
}
