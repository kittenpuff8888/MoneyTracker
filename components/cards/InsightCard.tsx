import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export function InsightCard({ insight }: { insight: string }) {
  return (
    <Card className="bg-sky-50">
      <CardHeader className="flex flex-row items-center gap-2">
        <Sparkles size={18} className="text-sky-600" />
        <CardTitle>AI Budget Conclusion</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-slate-700">{insight}</p>
      </CardContent>
    </Card>
  );
}
