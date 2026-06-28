import { Inbox } from "lucide-react";

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center p-8 text-center"
      style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--r)", boxShadow: "var(--sh)" }}
    >
      <div className="mb-4 rounded-full p-3" style={{ background: "var(--accentSoft)", color: "var(--accent)" }}>
        <Inbox size={22} />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-md text-sm" style={{ color: "var(--muted)" }}>{description}</p>
    </div>
  );
}
