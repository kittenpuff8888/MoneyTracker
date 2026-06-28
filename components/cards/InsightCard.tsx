import { Sparkles } from "lucide-react";
import { AsyncInsightText } from "@/components/ai/AsyncInsightText";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export function InsightCard({ insight, period = "monthly" }: { insight: string; period?: "weekly" | "monthly" }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2 border-b-0 pb-2">
        <Sparkles size={16} className="text-primary" />
        <CardTitle>AI Insights</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <AsyncInsightText
          initialInsight={insight}
          period={period}
          className="text-sm leading-6 text-muted-foreground"
        />
      </CardContent>
    </Card>
  );
}
