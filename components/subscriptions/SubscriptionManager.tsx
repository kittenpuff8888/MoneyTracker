"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { upsertSubscription, deleteSubscription } from "@/lib/actions/subscriptions";
import { formatIDR } from "@/lib/formatters";
import { typedZodResolver } from "@/lib/form-resolver";
import { subscriptionSchema } from "@/lib/validations";
import { transactionCategories, type Account, type Subscription } from "@/lib/types";
import type { z } from "zod";

type SubscriptionValues = z.infer<typeof subscriptionSchema>;

export function SubscriptionManager({ subscriptions, accounts }: { subscriptions: Subscription[]; accounts: Account[] }) {
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [pending, startTransition] = useTransition();
  const monthlyTotal = subscriptions.reduce((sum, item) => sum + Number(item.amount), 0);
  const { register, handleSubmit, reset } = useForm<SubscriptionValues>({
    resolver: typedZodResolver<SubscriptionValues>(subscriptionSchema),
    defaultValues: { name: "", amount: 0, billing_date: new Date().toISOString().slice(0, 10), category: "Subscription", account_id: "", frequency: "monthly", notes: "" }
  });

  function edit(subscription: Subscription) {
    setEditing(subscription);
    reset({
      id: subscription.id,
      name: subscription.name,
      amount: subscription.amount,
      billing_date: subscription.billing_date,
      category: subscription.category as SubscriptionValues["category"],
      account_id: subscription.account_id ?? "",
      frequency: subscription.frequency as SubscriptionValues["frequency"],
      notes: subscription.notes ?? ""
    });
  }

  function onSubmit(values: SubscriptionValues) {
    startTransition(async () => {
      await upsertSubscription(values);
      setEditing(null);
      reset({ name: "", amount: 0, billing_date: new Date().toISOString().slice(0, 10), category: "Subscription", account_id: "", frequency: "monthly", notes: "" });
    });
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-[1fr_280px]">
        <Card>
          <CardHeader><CardTitle>{editing ? "Edit Subscription" : "Add Subscription"}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-3">
              <label className="grid gap-1 text-sm font-medium">Name<Input {...register("name")} /></label>
              <label className="grid gap-1 text-sm font-medium">Amount<Input type="number" min="0" step="1000" {...register("amount")} /></label>
              <label className="grid gap-1 text-sm font-medium">Billing Date<Input type="date" {...register("billing_date")} /></label>
              <label className="grid gap-1 text-sm font-medium">Category<Select {...register("category")}>{transactionCategories.map((category) => <option key={category}>{category}</option>)}</Select></label>
              <label className="grid gap-1 text-sm font-medium">Account<Select {...register("account_id")}><option value="">None</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</Select></label>
              <label className="grid gap-1 text-sm font-medium">Frequency<Select {...register("frequency")}>{["weekly", "monthly", "yearly", "custom"].map((item) => <option key={item}>{item}</option>)}</Select></label>
              <label className="grid gap-1 text-sm font-medium md:col-span-3">Notes<Textarea {...register("notes")} /></label>
              <div className="md:col-span-3 md:justify-self-end"><Button disabled={pending}>{pending ? "Saving..." : editing ? "Save Subscription" : "Add Subscription"}</Button></div>
            </form>
          </CardContent>
        </Card>
        <Card><CardContent><p className="text-sm text-muted-foreground">Monthly Subscription Total</p><p className="mt-3 text-2xl font-bold">{formatIDR(monthlyTotal)}</p><p className="mt-2 text-sm text-muted-foreground">Renewal warnings use billing dates.</p></CardContent></Card>
      </div>
      <div className="grid gap-4">
        {subscriptions.length === 0 ? <Card><CardContent><p className="text-sm text-muted-foreground">No subscriptions yet. Add recurring payments to avoid surprise bills.</p></CardContent></Card> : subscriptions.map((subscription) => (
          <Card key={subscription.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-4">
              <div><p className="font-semibold">{subscription.name}</p><p className="text-sm text-muted-foreground">{subscription.frequency} renewal on {subscription.billing_date}</p></div>
              <p className="font-bold">{formatIDR(subscription.amount)}</p>
              <div className="flex gap-2">
                <Button variant="secondary" className="h-8 px-3" onClick={() => edit(subscription)}><Pencil size={14} />Edit</Button>
                <Button variant="danger" className="h-8 px-3" onClick={() => startTransition(async () => deleteSubscription(subscription.id))}><Trash2 size={14} />Delete</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
