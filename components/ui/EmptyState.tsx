import { Inbox } from "lucide-react";
import { Card } from "@/components/ui/Card";

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card className="flex flex-col items-center justify-center p-8 text-center">
      <div className="mb-4 rounded-full bg-sky-100 p-3 text-sky-600">
        <Inbox size={22} />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
    </Card>
  );
}
