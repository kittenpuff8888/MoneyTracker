import { CalendarClock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { formatIDR } from "@/lib/formatters";
import type { Subscription } from "@/lib/types";

export function SubscriptionCard({ subscriptions }: { subscriptions: Subscription[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <CalendarClock size={18} className="text-sky-600" />
        <CardTitle>Subscriptions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {subscriptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No subscriptions yet.</p>
        ) : (
          subscriptions.map((subscription) => (
            <div key={subscription.id} className="flex items-center justify-between gap-4 rounded-lg bg-sky-50 px-3 py-2">
              <div>
                <p className="text-sm font-medium">{subscription.name}</p>
                <p className="text-xs text-muted-foreground">{subscription.billing_date}</p>
              </div>
              <p className="text-sm font-semibold">{formatIDR(subscription.amount)}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
