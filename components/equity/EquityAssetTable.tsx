"use client";

import { useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { deleteEquityAsset } from "@/lib/actions/equity";
import { calculateEquityGainLoss } from "@/lib/calculations";
import { formatIDR, formatPercent } from "@/lib/formatters";
import type { EquityAsset } from "@/lib/types";

export function EquityAssetTable({ assets, onEdit }: { assets: EquityAsset[]; onEdit?: (asset: EquityAsset) => void }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-sky-50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Asset</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Invested</th>
              <th className="px-4 py-3">Current Value</th>
              <th className="px-4 py-3">Gain/Loss</th>
              <th className="px-4 py-3">Quantity</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {assets.map((asset) => {
              const gain = calculateEquityGainLoss(asset);
              return (
                <tr key={asset.id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{asset.name}</p>
                    <p className="text-xs text-muted-foreground">{asset.symbol ?? "-"}</p>
                  </td>
                  <td className="px-4 py-3">{asset.asset_type}</td>
                  <td className="px-4 py-3">{formatIDR(asset.amount_invested)}</td>
                  <td className="px-4 py-3">{formatIDR(asset.current_value)}</td>
                  <td className={gain.gainLoss >= 0 ? "px-4 py-3 text-emerald-600" : "px-4 py-3 text-red-600"}>
                    {formatIDR(gain.gainLoss)} ({formatPercent(gain.gainLossPercent)})
                  </td>
                  <td className="px-4 py-3">{asset.quantity}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button variant="secondary" className="h-8 px-3" onClick={() => onEdit?.(asset)}>
                        <Pencil size={14} />
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        className="h-8 px-3"
                        disabled={pending}
                        onClick={() => startTransition(async () => deleteEquityAsset(asset.id))}
                      >
                        <Trash2 size={14} />
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
