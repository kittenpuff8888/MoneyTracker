export function LoadingState({ label = "Loading your dashboard..." }: { label?: string }) {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-lg border border-border bg-white text-sm text-muted-foreground">
      <span className="mr-3 h-3 w-3 animate-pulse rounded-full bg-sky-500" />
      {label}
    </div>
  );
}
