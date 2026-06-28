export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-sky-200 border-t-sky-500" aria-hidden />
        <span className="text-sm">Loading…</span>
      </div>
    </div>
  );
}
