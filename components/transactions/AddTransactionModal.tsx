"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { QuickTransactionForm } from "@/components/transactions/QuickTransactionForm";

/* ─── Context so any component can trigger the modal ─── */
type ModalCtx = { open: () => void };
const Ctx = createContext<ModalCtx>({ open: () => {} });
export function useAddTransaction() { return useContext(Ctx); }

export function AddTransactionModal({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setIsOpen(false); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  return (
    <Ctx.Provider value={{ open: () => setIsOpen(true) }}>
      {children}

      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-end">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Slide-in panel */}
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Add Transaction"
            className="relative z-10 flex h-full w-full max-w-md flex-col bg-card shadow-2xl md:w-[420px]"
            style={{ borderRadius: "var(--shell-radius) 0 0 var(--shell-radius)" }}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold">Add Transaction</h2>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setIsOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
              >
                <X size={17} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <QuickTransactionForm onSaved={() => setIsOpen(false)} />
            </div>
          </aside>
        </div>
      )}
    </Ctx.Provider>
  );
}
