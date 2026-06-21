"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { EquityAllocationChart } from "@/components/charts/EquityAllocationChart";
import { EquityAssetForm } from "@/components/equity/EquityAssetForm";
import { EquityAssetTable } from "@/components/equity/EquityAssetTable";
import { formatIDR } from "@/lib/formatters";
import type { EquityAsset } from "@/lib/types";

export function EquityManager({ assets }: { assets: EquityAsset[] }) {
  const [editing, setEditing] = useState<EquityAsset | null>(null);
  const invested = assets.reduce((sum, asset) => sum + Number(asset.amount_invested ?? 0), 0);
  const current = assets.reduce((sum, asset) => sum + Number(asset.current_value ?? 0), 0);
  const gain = current - invested;

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent><p className="text-sm text-muted-foreground">Total Invested</p><p className="mt-2 text-2xl font-bold">{formatIDR(invested)}</p></CardContent></Card>
        <Card><CardContent><p className="text-sm text-muted-foreground">Current Value</p><p className="mt-2 text-2xl font-bold">{formatIDR(current)}</p></CardContent></Card>
        <Card><CardContent><p className="text-sm text-muted-foreground">Unrealized Gain/Loss</p><p className={gain >= 0 ? "mt-2 text-2xl font-bold text-emerald-600" : "mt-2 text-2xl font-bold text-red-600"}>{formatIDR(gain)}</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>{editing ? "Edit Asset" : "Add Equity Asset"}</CardTitle></CardHeader>
        <CardContent><EquityAssetForm asset={editing} onSaved={() => setEditing(null)} /></CardContent>
      </Card>
      {assets.length === 0 ? (
        <EmptyState title="No assets tracked yet." description="Add your first asset to customize your equity tracker." />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <EquityAssetTable assets={assets} onEdit={setEditing} />
          <Card><CardHeader><CardTitle>Allocation</CardTitle></CardHeader><CardContent><EquityAllocationChart assets={assets} /></CardContent></Card>
        </div>
      )}
    </div>
  );
}
