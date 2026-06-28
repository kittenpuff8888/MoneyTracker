export function LoadingState({ label = "Loading your dashboard..." }: { label?: string }) {
  return (
    <div
      className="flex min-h-48 items-center justify-center text-sm"
      style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--r)", color: "var(--muted)" }}
    >
      <span className="mr-3 h-3 w-3 animate-pulse rounded-full" style={{ background: "var(--accent)" }} />
      {label}
    </div>
  );
}
