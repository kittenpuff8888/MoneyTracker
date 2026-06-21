import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { formatIDR, formatPercent } from "@/lib/formatters";
import type { BudgetUsage } from "@/lib/calculations";

export function BudgetWarningCard({ warnings }: { warnings: BudgetUsage[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <AlertTriangle size={18} className="text-orange-500" />
        <CardTitle>Budget Almost Exceeded</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {warnings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No budget warnings right now.</p>
        ) : (
          warnings.map((item) => (
            <div key={item.budget.id}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <p className="font-medium">{item.budget.category}</p>
                <p className="text-muted-foreground">{formatIDR(item.remaining)} left</p>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-orange-400"
                  style={{ width: `${Math.min(item.percentUsed, 100)}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{formatPercent(item.percentUsed)} used</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
