"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export function Modal({
  open,
  title,
  onClose,
  children
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  // Only close when a click both STARTS and ENDS on the backdrop. This prevents
  // the modal from closing when the user selects text inside a field and the
  // mouse happens to release over the backdrop.
  const pressedBackdrop = useRef(false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div
        aria-hidden
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
        onMouseDown={(e) => { pressedBackdrop.current = e.target === e.currentTarget; }}
        onMouseUp={(e) => { if (pressedBackdrop.current && e.target === e.currentTarget) onClose(); pressedBackdrop.current = false; }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-base font-semibold">{title}</h3>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            <X size={17} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
