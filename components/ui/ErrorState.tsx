import { AlertCircle } from "lucide-react";

export function ErrorState({ message = "We could not load your dashboard." }: { message?: string }) {
  return (
    <div
      className="flex min-h-32 items-center gap-3 rounded-[12px] p-5 text-sm"
      style={{ background: "var(--downSoft)", border: "1px solid var(--down)", color: "var(--down)" }}
    >
      <AlertCircle size={18} />
      {message}
    </div>
  );
}
