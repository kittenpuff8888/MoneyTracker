import { z } from "zod";

const optionalUuid = z.string().uuid().optional().nullable().or(z.literal("").transform(() => null));

export const accountSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2, "Name is required"),
  type: z.enum(["Bank", "Cash", "E-wallet", "E-Money", "Investment", "Savings", "Other"]),
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
    fee: z.coerce.number().min(0, "Fee cannot be negative").default(0),
    category: z.string().min(1, "Category is required"),
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
  category: z.string().min(1, "Category is required"),
  monthly_limit: z.coerce.number().positive("Monthly limit must be greater than 0")
});

export const subscriptionSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2),
  amount: z.coerce.number().positive(),
  billing_date: z.string().min(1),
  category: z.string().min(1).default("Subscription"),
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

const weekdays = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday"
] as const;

export const settingsSchema = z.object({
  full_name: z.string().min(1),
  weekly_report_enabled: z.coerce.boolean(),
  report_frequency: z.enum(["daily", "weekly", "monthly"]).default("weekly"),
  // day-of-week for weekly, day-of-month (1-28) as string for monthly, ignored for daily
  report_day: z.string().min(1).default("sunday"),
  report_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM 24-hour time")
    .default("08:00")
});

export const categorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Category name is required").max(40),
  kind: z.enum(["income", "outcome", "transfer", "all"]).default("all")
});

export { weekdays };

export const realizedTradeSchema = z.object({
  id: z.string().uuid().optional(),
  wallet_id: z.string().uuid({ message: "Select an investment wallet" }),
  ordered_item: z.string().min(1, "Item is required").max(40),
  lot: z.coerce.number().min(0).default(0),
  price: z.coerce.number().min(0).default(0),
  amount_done: z.coerce.number().min(0).default(0),
  total_fee: z.coerce.number().min(0).default(0),
  net_amount: z.coerce.number().default(0),
  realized_pnl: z.coerce.number().default(0),
  trade_date: z.string().min(1, "Trade date is required")
});
