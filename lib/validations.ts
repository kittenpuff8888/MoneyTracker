import { z } from "zod";

const optionalUuid = z.string().uuid().optional().nullable().or(z.literal("").transform(() => null));

export const accountSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2, "Name is required"),
  type: z.enum(["Bank", "Cash", "E-wallet", "E-Money", "Investment", "Savings", "Other"]),
  starting_balance: z.coerce.number().min(0),
  current_balance: z.coerce.number().min(0),
  color: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  card_info: z.string().max(200).optional().nullable()
});

export const transactionSchema = z
  .object({
    id: z.string().uuid().optional(),
    type: z.enum(["income", "outcome", "transfer", "covering"]),
    name: z.string().max(80).optional().nullable(),
    amount: z.coerce.number().positive("Amount must be greater than 0"),
    fee: z.coerce.number().min(0, "Fee cannot be negative").default(0),
    category: z.string().min(1, "Category is required").optional().nullable(),
    from_account_id: optionalUuid,
    to_account_id: optionalUuid,
    transaction_date: z.string().min(1, "Transaction date is required"),
    notes: z.string().optional().nullable(),
    covered_for: z.string().max(100).optional().nullable()
  })
  .superRefine((value, ctx) => {
    if (value.type === "income" && !value.to_account_id) {
      ctx.addIssue({ code: "custom", path: ["to_account_id"], message: "Income requires a destination account" });
    }
    if (value.type === "outcome" && !value.from_account_id) {
      ctx.addIssue({ code: "custom", path: ["from_account_id"], message: "Outcome requires a source account" });
    }
    if (value.type === "covering") {
      if (!value.from_account_id) {
        ctx.addIssue({ code: "custom", path: ["from_account_id"], message: "Covering requires a source wallet" });
      }
      if (!value.covered_for || value.covered_for.trim() === "") {
        ctx.addIssue({ code: "custom", path: ["covered_for"], message: "Enter who you're covering for" });
      }
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

// Empty string is a valid `z.string()`, so `.or(z.literal(""))` never triggers.
// Normalize "", whitespace, null, and undefined all to null so empty optional
// date inputs are not sent as "" to a Postgres `date` column.
const optionalDate = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => (typeof v === "string" && v.trim() !== "" ? v : null));

export const budgetSchema = z.object({
  id: z.string().uuid().optional(),
  category: z.string().min(1, "Category is required"),
  monthly_limit: z.coerce.number().positive("Limit must be greater than 0"),
  period_start: optionalDate,
  period_end: optionalDate
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
    .default("08:00"),
  // Day of month your salary lands — anchors the "This month" pay-cycle range.
  pay_day: z.coerce.number().int().min(1).max(28).default(1)
});

export const goalSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Goal name is required").max(60),
  wallet_id: z.string().uuid({ message: "Select a savings wallet" }),
  category: z.string().optional().nullable(),
  description: z.string().max(300).optional().nullable(),
  target_amount: z.coerce.number().positive("Target must be greater than 0"),
  start_date: optionalDate,
  deadline: optionalDate
});

export const categorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Category name is required").max(40),
  kind: z.enum(["income", "outcome", "transfer", "all"]).default("all")
});

export { weekdays };

export const realizedTradeSchema = z
  .object({
    id: z.string().uuid().optional(),
    wallet_id: z.string().uuid({ message: "Select an investment wallet" }),
    ordered_item: z.string().min(1, "Ticker is required").max(40),
    status: z.enum(["open", "realized"]).default("realized"),
    entry_price: z.coerce.number().min(0, "Entry price is required").default(0),
    exit_price: z.coerce.number().min(0).optional().nullable(),
    total_fee: z.coerce.number().min(0).default(0),
    realized_pnl: z.coerce.number().default(0),
    trade_date: z.string().min(1, "Trade date is required")
  })
  .superRefine((value, ctx) => {
    if (value.status === "realized" && (value.exit_price == null || value.exit_price === 0)) {
      ctx.addIssue({ code: "custom", path: ["exit_price"], message: "Exit price is required for a realized trade" });
    }
  });
