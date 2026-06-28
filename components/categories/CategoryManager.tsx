"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus, Save, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { ConfirmDeleteButton } from "@/components/ui/ConfirmDeleteButton";
import { upsertCategory, deleteCategory } from "@/lib/actions/categories";
import type { TransactionCategoryRow } from "@/lib/types";

const KINDS = ["all", "income", "outcome", "transfer"] as const;

export function CategoryManager({ categories }: { categories: TransactionCategoryRow[] }) {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<(typeof KINDS)[number]>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  function add() {
    if (!name.trim()) return;
    startTransition(async () => {
      try {
        await upsertCategory({ name: name.trim(), kind });
        setName("");
        toast.success("Category added.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to add category.");
      }
    });
  }

  function saveRename(id: string) {
    if (!editName.trim()) return;
    startTransition(async () => {
      try {
        await upsertCategory({ id, name: editName.trim(), kind: "all" });
        setEditingId(null);
        toast.success("Category renamed.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to rename category.");
      }
    });
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <Input placeholder="New category name" value={name} onChange={(e) => setName(e.target.value)} />
        <Select value={kind} onChange={(e) => setKind(e.target.value as (typeof KINDS)[number])}>
          {KINDS.map((k) => (
            <option key={k} value={k} className="capitalize">
              {k}
            </option>
          ))}
        </Select>
        <Button type="button" onClick={add} disabled={pending || !name.trim()}>
          <Plus size={16} />
          Add
        </Button>
      </div>

      <div className="divide-y divide-border rounded-lg border border-border">
        {categories.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">No categories yet. Add your first one above.</p>
        ) : (
          categories.map((category) => (
            <div key={category.id} className="flex items-center justify-between gap-3 p-3 text-sm">
              {editingId === category.id ? (
                <div className="flex flex-1 items-center gap-2">
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-9" />
                  <Button type="button" className="h-9 px-3" onClick={() => saveRename(category.id)} disabled={pending}>
                    <Save size={14} />
                  </Button>
                  <Button type="button" variant="secondary" className="h-9 px-3" onClick={() => setEditingId(null)}>
                    <X size={14} />
                  </Button>
                </div>
              ) : (
                <>
                  <div>
                    <span className="font-medium">{category.name}</span>
                    {category.kind !== "all" ? (
                      <span className="ml-2 rounded bg-sky-50 px-2 py-0.5 text-xs capitalize text-sky-700">{category.kind}</span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-8 px-3"
                      onClick={() => {
                        setEditingId(category.id);
                        setEditName(category.name);
                      }}
                    >
                      <Pencil size={14} />
                      Rename
                    </Button>
                    <ConfirmDeleteButton
                      itemName={`${category.name} category`}
                      successMessage="Category deleted."
                      onConfirm={() => deleteCategory(category.id)}
                    />
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
