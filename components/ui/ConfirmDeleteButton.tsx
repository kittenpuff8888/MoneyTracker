"use client";

import { useState, useTransition } from "react";
import { Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";

type Props = {
  itemName: string;
  onConfirm: () => Promise<void>;
  successMessage: string;
  warningText?: string;
  compact?: boolean;
};

export function ConfirmDeleteButton({
  itemName,
  onConfirm,
  successMessage,
  warningText = "This action cannot be undone.",
  compact = false
}: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirmDelete() {
    startTransition(async () => {
      try {
        await onConfirm();
        setOpen(false);
        toast.success(successMessage);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to delete this item.");
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="danger"
        aria-label={`Delete ${itemName}`}
        className={compact ? "h-9 w-9 px-0 md:h-8 md:w-auto md:px-3" : "h-8 px-3"}
        onClick={() => setOpen(true)}
      >
        <Trash2 size={14} />
        <span className={compact ? "sr-only md:not-sr-only" : undefined}>Delete</span>
      </Button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-foreground/30 backdrop-blur-sm p-0 sm:items-center sm:p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-delete-title"
            className="w-full border border-border bg-card p-5 shadow-2xl sm:max-w-md sm:rounded-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="confirm-delete-title" className="text-base font-semibold">Delete {itemName}?</h2>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{warningText}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="h-9 w-9 shrink-0 px-0"
                aria-label="Close"
                onClick={() => setOpen(false)}
              >
                <X size={17} />
              </Button>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="secondary" disabled={pending} onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="button" variant="danger" disabled={pending} onClick={confirmDelete}>
                <Trash2 size={15} />
                {pending ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
