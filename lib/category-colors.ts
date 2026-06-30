// Deterministic category colors — mirrors the 8888 Tracker v2 palette so the
// same category always renders the same swatch across every page.
const PALETTE = [
  "#2563eb", "#16a34a", "#ea580c", "#db2777", "#7c3aed",
  "#0e7490", "#65a30d", "#f59e0b", "#e5484d", "#0891b2"
];

export function categoryColor(name: string | null | undefined): string {
  const key = (name ?? "").trim().toLowerCase();
  if (!key) return "var(--faint)";
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

export type TxTypeMeta = { label: string; up: boolean; move: boolean };

export function txTypeMeta(type: string): TxTypeMeta {
  if (type === "income") return { label: "Income", up: true, move: false };
  if (type === "transfer") return { label: "Move Money", up: false, move: true };
  if (type === "covering") return { label: "Cover Bill", up: false, move: true };
  return { label: "Expense", up: false, move: false };
}

// Sign + color for a transaction amount, per spec:
//   income  → "+" blue · outcome → "−" red · transfer → no sign, plain black
//   covering (loan) → "−" amber
export function amountStyle(type: string): { sign: string; color: string } {
  if (type === "income") return { sign: "+", color: "var(--accent)" };
  if (type === "outcome") return { sign: "−", color: "var(--down)" };
  if (type === "covering") return { sign: "−", color: "#f59e0b" };
  return { sign: "", color: "var(--text)" };
}
