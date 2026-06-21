import { z } from "zod";
import { transactionCategories } from "@/lib/types";

const optionalUuid = z.string().uuid().optional().nullable().or(z.literal("").transform(() => null));

export const accountSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2, "Name is required"),
  type: z.enum(["Bank", "Cash", "E-wallet", "Investment", "Savings", "Other"]),
  starting_balance: z.coerce.number().min(0),
  current_balance: z.coerce.number().min(0),
  color: z.string().optional().nullable(),
  icon: z.string().optional().nullable()
});

export const transactionSchema = z
  .object({
    id: z.string().uuid().optional(),
    type: z.enum(["income", "outcome", "transfer"]),
    amount: z.coerce.number().positive("Amount must be greater than 0"),
    category: z.enum(transactionCategories),
    from_account_id: optionalUuid,
    to_account_id: optionalUuid,
    transaction_date: z.string().min(1, "Transaction date is required"),
    notes: z.string().optional().nullable()
  })
  .superRefine((value, ctx) => {
    if (value.type === "income" && !value.to_account_id) {
      ctx.addIssue({ code: "custom", path: ["to_account_id"], message: "Income requires a destination account" });
    }
    if (value.type === "outcome" && !value.from_account_id) {
      ctx.addIssue({ code: "custom", path: ["from_account_id"], message: "Outcome requires a source account" });
    }
    if (value.type === "transfer") {
      if (!value.from_account_id) {
        ctx.addIssue({ code: "custom", path: ["from_account_id"], message: "Transfer requires a source account" });
      }
      if (!value.to_account_id) {
        ctx.addIssue({ code: "custom", path: ["to_account_id"], message: "Transfer requires a destination account" });
      }
      if (value.from_account_id && value.to_account_id && value.from_account_id === value.to_account_id) {
        ctx.addIssue({ code: "custom", path: ["to_account_id"], message: "Transfer accounts must be different" });
      }
    }
  });

export const budgetSchema = z.object({
  id: z.string().uuid().optional(),
  category: z.enum(transactionCategories),
  monthly_limit: z.coerce.number().positive("Monthly limit must be greater than 0")
});

export const subscriptionSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2),
  amount: z.coerce.number().positive(),
  billing_date: z.string().min(1),
  category: z.enum(transactionCategories).default("Subscription"),
  account_id: optionalUuid,
  frequency: z.enum(["weekly", "monthly", "yearly", "custom"]),
  notes: z.string().optional().nullable()
});

export const equityAssetSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2),
  symbol: z.string().optional().nullable(),
  asset_type: z.enum(["Stock", "ETF", "Mutual Fund", "Crypto", "Bond", "Cash", "Other"]),
  amount_invested: z.coerce.number().min(0),
  current_value: z.coerce.number().min(0),
  quantity: z.coerce.number().min(0),
  notes: z.string().optional().nullable()
});

export const settingsSchema = z.object({
  full_name: z.string().min(1),
  weekly_report_enabled: z.coerce.boolean(),
  weekly_report_day: z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"])
});
