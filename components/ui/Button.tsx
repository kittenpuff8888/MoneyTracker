import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" && "bg-[#0b0e14] text-white shadow-card hover:bg-[#1c2230]",
        variant === "secondary" && "border border-border bg-white text-foreground hover:bg-slate-50",
        variant === "ghost" && "text-muted-foreground hover:bg-slate-50 hover:text-foreground",
        variant === "danger" && "bg-red-500 text-white hover:bg-red-600",
        className
      )}
      {...props}
    />
  );
}
