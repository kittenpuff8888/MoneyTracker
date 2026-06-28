import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "sky" | "green" | "orange" | "red" | "gray";
};

export function Badge({ className, tone = "sky", ...props }: BadgeProps) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", className)}
      style={{
        background:
          tone === "green" ? "var(--upSoft)"
          : tone === "orange" ? "var(--warnSoft)"
          : tone === "red" ? "var(--downSoft)"
          : tone === "gray" ? "var(--soft)"
          : "var(--accentSoft)",
        color:
          tone === "green" ? "var(--up)"
          : tone === "orange" ? "var(--warn)"
          : tone === "red" ? "var(--down)"
          : tone === "gray" ? "var(--muted)"
          : "var(--accent)",
        ...props.style
      }}
      {...props}
    />
  );
}
