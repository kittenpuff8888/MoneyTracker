"use client";

import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDeleteButton } from "@/components/ui/ConfirmDeleteButton";
import { deleteEquityAsset } from "@/lib/actions/equity";
import { calculateEquityGainLoss } from "@/lib/calculations";
import { formatIDR, formatPercent } from "@/lib/formatters";
import type { EquityAsset } from "@/lib/types";

export function EquityAssetTable({ assets, onEdit }: { assets: EquityAsset[]; onEdit?: (asset: EquityAsset) => void }) {
  return (
    <>
      <div className="grid gap-3 md:hidden">
        {assets.map((asset) => {
          const gain = calculateEquityGainLoss(asset);
          return (
            <article key={asset.id} className="rounded-lg border border-border bg-white p-4 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold">{asset.name}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">{asset.symbol ?? asset.asset_type}</p>
                </div>
                <p className={gain.gainLoss >= 0 ? "text-right text-sm font-bold text-emerald-600" : "text-right text-sm font-bold text-red-600"}>
                  {formatPercent(gain.gainLossPercent)}
                </p>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3 text-xs">
                <div>
                  <dt className="text-muted-foreground">Invested</dt>
                  <dd className="mt-1 font-semibold">{formatIDR(asset.amount_invested)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Current value</dt>
                  <dd className="mt-1 font-semibold">{formatIDR(asset.current_value)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Gain/loss</dt>
                  <dd className={gain.gainLoss >= 0 ? "mt-1 font-semibold text-emerald-600" : "mt-1 font-semibold text-red-600"}>
                    {formatIDR(gain.gainLoss)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Quantity</dt>
                  <dd className="mt-1 font-semibold">{asset.quantity}</dd>
                </div>
              </dl>
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  variant="secondary"
                  aria-label={`Edit ${asset.name}`}
                  className="h-11 w-11 px-0"
                  onClick={() => onEdit?.(asset)}
                >
                  <Pencil size={16} />
                </Button>
                <ConfirmDeleteButton
                  compact
                  itemName={asset.name}
                  successMessage="Investment asset deleted."
                  onConfirm={() => deleteEquityAsset(asset.id)}
                />
              </div>
            </article>
          );
        })}
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-border bg-white md:block">
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
                      <ConfirmDeleteButton
                        itemName={asset.name}
                        successMessage="Investment asset deleted."
                        onConfirm={() => deleteEquityAsset(asset.id)}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
    </>
  );
}
