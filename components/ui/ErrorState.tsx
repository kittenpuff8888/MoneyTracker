import { AlertCircle } from "lucide-react";

export function ErrorState({ message = "We could not load your dashboard." }: { message?: string }) {
  return (
    <div className="flex min-h-32 items-center gap-3 rounded-lg border border-red-100 bg-red-50 p-5 text-sm text-red-700">
      <AlertCircle size={18} />
      {message}
    </div>
  );
}
