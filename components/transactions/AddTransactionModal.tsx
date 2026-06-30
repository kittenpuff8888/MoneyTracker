"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { QuickTransactionForm } from "@/components/transactions/QuickTransactionForm";

type TxType = "outcome" | "income" | "transfer" | "covering";

/* ─── Context — any component in the tree can call open() ─── */
type ModalCtx = { open: (type?: TxType) => void };
const Ctx = createContext<ModalCtx>({ open: () => {} });
export function useAddTransaction() { return useContext(Ctx); }

/* Provider wraps the shell so sidebar + dashboard + mobile FAB can trigger it */
export function AddTransactionProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [preset, setPreset] = useState<TxType>("outcome");

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

  // Close only when a click both starts and ends on the dimmed backdrop, so
  // selecting text inside a field and releasing on the backdrop won't close it.
  const pressedBackdrop = useRef(false);

  return (
    <Ctx.Provider value={{ open: (type) => { setPreset(type ?? "outcome"); setIsOpen(true); } }}>
      {children}

      {isOpen && (
        <div
          className="fixed inset-0 z-[90] flex items-stretch justify-end"
          style={{ background: "rgba(11,14,20,.5)" }}
          onMouseDown={(e) => { pressedBackdrop.current = e.target === e.currentTarget; }}
          onMouseUp={(e) => { if (pressedBackdrop.current && e.target === e.currentTarget) setIsOpen(false); pressedBackdrop.current = false; }}
        >
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Add Transaction"
            onClick={(e) => e.stopPropagation()}
            className="animate-fadein flex h-full w-full max-w-[440px] flex-col"
            style={{ background: "var(--panel)", borderLeft: "1px solid var(--border)", boxShadow: "-24px 0 60px rgba(0,0,0,.22)" }}
          >
            <div
              className="flex items-center justify-between px-[22px] py-[18px]"
              style={{ borderBottom: "1px solid var(--hair)" }}
            >
              <div>
                <div className="text-[16px] font-bold">Add New Transaction</div>
                <div className="mt-0.5 text-[12px]" style={{ color: "var(--muted)" }}>Fill in the details to record your activity.</div>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setIsOpen(false)}
                className="flex h-[30px] w-[30px] items-center justify-center rounded-lg"
                style={{ border: "1px solid var(--border)", color: "var(--muted)" }}
              >
                ✕
              </button>
            </div>
            <QuickTransactionForm
              presetType={preset}
              onSaved={() => setIsOpen(false)}
              onCancel={() => setIsOpen(false)}
            />
          </aside>
        </div>
      )}
    </Ctx.Provider>
  );
}
