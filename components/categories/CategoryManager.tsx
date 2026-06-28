"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { upsertCategory, deleteCategory } from "@/lib/actions/categories";
import { categoryColor } from "@/lib/category-colors";
import type { TransactionCategoryRow } from "@/lib/types";

export function CategoryManager({ categories }: { categories: TransactionCategoryRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");

  function add() {
    const trimmed = name.trim();
    if (!trimmed) return;
    startTransition(async () => {
      try {
        await upsertCategory({ name: trimmed, kind: "all" });
        setName("");
        toast.success("Category added.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to add category.");
      }
    });
  }

  function rename(category: TransactionCategoryRow, next: string) {
    const trimmed = next.trim();
    if (!trimmed || trimmed === category.name) return;
    startTransition(async () => {
      try {
        await upsertCategory({ id: category.id, name: trimmed, kind: category.kind });
        toast.success("Category renamed.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to rename category.");
      }
    });
  }

  function remove(category: TransactionCategoryRow) {
    startTransition(async () => {
      try {
        await deleteCategory(category.id);
        toast.success("Category deleted.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to delete category.");
      }
    });
  }

  const previewColor = categoryColor(name || "new");

  return (
    <div>
      {/* Add row */}
      <div className="mb-4 flex gap-2">
        <div className="flex flex-1 items-center gap-[7px] rounded-[10px] px-3 py-[9px]" style={{ background: "var(--soft)", border: "1px solid var(--border)" }}>
          <span className="h-3 w-3 flex-[0_0_12px] rounded-[4px]" style={{ background: previewColor }} />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
            placeholder="New category name…"
            className="w-full border-none bg-transparent text-[13px] outline-none"
            style={{ color: "var(--text)" }}
          />
        </div>
        <button
          type="button"
          onClick={add}
          disabled={pending || !name.trim()}
          className="flex items-center gap-1.5 rounded-[10px] px-4 text-[12.5px] font-semibold transition hover:opacity-90 disabled:opacity-50"
          style={{ background: "var(--ink)", color: "var(--panel)" }}
        >
          + Add
        </button>
      </div>

      {/* List */}
      <div className="flex flex-col gap-2">
        {categories.length === 0 ? (
          <p className="text-[13px]" style={{ color: "var(--muted)" }}>No categories yet. Add your first one above.</p>
        ) : (
          categories.map((category) => (
            <div key={category.id} className="flex items-center gap-[11px] rounded-[11px] px-[13px] py-2.5" style={{ border: "1px solid var(--border)" }}>
              <span className="h-3 w-3 flex-[0_0_12px] rounded-[4px]" style={{ background: categoryColor(category.name) }} />
              <input
                defaultValue={category.name}
                onBlur={(e) => rename(category, e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                className="flex-1 border-none bg-transparent text-[13px] font-semibold outline-none"
                style={{ color: "var(--text)" }}
              />
              {category.kind !== "all" && (
                <span className="num rounded-[6px] px-2 py-0.5 text-[10px] font-semibold capitalize" style={{ background: "var(--soft)", color: "var(--muted)" }}>{category.kind}</span>
              )}
              <button
                type="button"
                onClick={() => remove(category)}
                aria-label={`Delete ${category.name}`}
                className="flex h-7 w-7 items-center justify-center rounded-lg"
                style={{ border: "1px solid var(--border)", color: "var(--down)" }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
