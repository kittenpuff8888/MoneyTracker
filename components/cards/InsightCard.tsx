import { Sparkles } from "lucide-react";
import { AsyncInsightText } from "@/components/ai/AsyncInsightText";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export function InsightCard({ insight, period = "monthly" }: { insight: string; period?: "weekly" | "monthly" }) {
  return (
    <Card className="bg-sky-50">
      <CardHeader className="flex flex-row items-center gap-2">
        <Sparkles size={18} className="text-sky-600" />
        <CardTitle>AI Budget Conclusion</CardTitle>
      </CardHeader>
      <CardContent>
        <AsyncInsightText initialInsight={insight} period={period} className="text-sm leading-6 text-slate-700" />
      </CardContent>
    </Card>
  );
}
