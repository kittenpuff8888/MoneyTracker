import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";

type StatCardProps = {
  title: string;
  value: string;
  icon?: ReactNode;
  badge?: string;
  badgeTone?: "sky" | "green" | "orange" | "red" | "gray";
  helper?: string;
  children?: ReactNode;
};

export function StatCard({ title, value, icon, badge, badgeTone = "sky", helper, children }: StatCardProps) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="mt-3 break-words text-xl font-bold tracking-normal sm:text-2xl">{value}</p>
          </div>
          {icon && <div className="rounded-lg bg-sky-50 p-2 text-sky-600">{icon}</div>}
        </div>
        <div className="mt-3 flex items-center gap-2">
          {badge && <Badge tone={badgeTone}>{badge}</Badge>}
          {helper && <span className="text-xs text-muted-foreground">{helper}</span>}
        </div>
        {children && <div className="mt-4">{children}</div>}
      </CardContent>
    </Card>
  );
}
