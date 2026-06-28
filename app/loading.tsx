export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3" style={{ color: "var(--muted)" }}>
        <span
          className="h-8 w-8 animate-spin rounded-full"
          style={{ border: "2px solid var(--border)", borderTopColor: "var(--accent)" }}
          aria-hidden
        />
        <span className="text-sm">Loading…</span>
      </div>
    </div>
  );
}
