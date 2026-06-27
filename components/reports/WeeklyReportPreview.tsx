import { AsyncInsightText } from "@/components/ai/AsyncInsightText";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { formatIDR, formatPercent } from "@/lib/formatters";
import type { CategoryTotal } from "@/lib/calculations";

export function WeeklyReportPreview({
  income,
  outcome,
  netSaved,
  savingsRate,
  topCategories,
  insight
}: {
  income: number;
  outcome: number;
  netSaved: number;
  savingsRate: number;
  topCategories: CategoryTotal[];
  insight: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Preview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="font-semibold">Your Weekly 8888 Tracker Report</p>
        <p className="text-muted-foreground">Here is your weekly 8888 Tracker summary.</p>
        <div className="grid gap-2 rounded-lg bg-sky-50 p-4">
          <p>Total Income: <strong>{formatIDR(income)}</strong></p>
          <p>Total Outcome: <strong>{formatIDR(outcome)}</strong></p>
          <p>Net Saved: <strong>{formatIDR(netSaved)}</strong></p>
          <p>Savings Rate: <strong>{formatPercent(savingsRate)}</strong></p>
        </div>
        <div>
          <p className="font-semibold">Top Spending</p>
          <ol className="mt-2 space-y-1">
            {topCategories.slice(0, 5).map((category, index) => (
              <li key={category.category}>{index + 1}. {category.category} - {formatIDR(category.amount)}</li>
            ))}
          </ol>
        </div>
        <div>
          <p className="font-semibold">AI Conclusion</p>
          <AsyncInsightText initialInsight={insight} period="weekly" className="mt-1 leading-6 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}
