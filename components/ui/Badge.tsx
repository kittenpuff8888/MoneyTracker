import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "sky" | "green" | "orange" | "red" | "gray";
};

export function Badge({ className, tone = "sky", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        tone === "sky" && "bg-sky-100 text-sky-700",
        tone === "green" && "bg-emerald-100 text-emerald-700",
        tone === "orange" && "bg-orange-100 text-orange-700",
        tone === "red" && "bg-red-100 text-red-700",
        tone === "gray" && "bg-slate-100 text-slate-600",
        className
      )}
      {...props}
    />
  );
}
