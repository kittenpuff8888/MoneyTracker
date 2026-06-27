"use client";

import { useEffect, useId, useRef, useState } from "react";
import { BookOpen, CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";

const setupSteps = [
  {
    title: "Add your accounts first",
    description: "Open Accounts and create every place where you keep money: bank, cash, e-wallet, savings, or investment cash.",
    detail: "Use the real current balance as the starting balance so the dashboard total begins accurately."
  },
  {
    title: "Record your transactions",
    description: "Use Income when money enters, Outcome when you spend, and Transfer when money moves between your own accounts.",
    detail: "Choose the correct account, category, amount, and date. Transfers should always include both source and destination accounts."
  },
  {
    title: "Create monthly budgets",
    description: "Open Budget and set a monthly limit for categories you want to control, such as Food, Transport, Shopping, or Entertainment.",
    detail: "Warnings appear as spending reaches 75%, 90%, and 100% of each limit."
  },
  {
    title: "Add recurring bills",
    description: "Open Subscriptions and enter services, bills, renewal dates, frequency, amount, and the account normally used to pay.",
    detail: "This powers upcoming-bill reminders, subscription analysis, and cash-flow forecasts."
  },
  {
    title: "Add investments if needed",
    description: "Open Equity Tracker to record shares, funds, crypto, property, or other assets with invested and current values.",
    detail: "Update current values periodically so portfolio gain, loss, and allocation remain useful."
  },
  {
    title: "Review reports and preferences",
    description: "Use Reports for weekly and monthly summaries. Open Settings to control your profile and weekly email report preference.",
    detail: "Keep weekly reports enabled if you want the Sunday 7:00 PM WIB financial summary."
  },
  {
    title: "Finish on the Dashboard",
    description: "Return to Dashboard after entering your data. It combines account balances, this month's activity, budgets, bills, investments, and recommendations.",
    detail: "The more consistently you record transactions, the more accurate every dashboard insight becomes."
  }
];

const dashboardItems = [
  ["Net Balance", "The total current balance across all accounts."],
  ["Income", "Money received during the current month."],
  ["Outcome", "Money spent during the current month."],
  ["Savings Ratio", "The percentage of monthly income left after outcomes. A higher positive percentage is healthier."],
  ["Remaining Balance", "Current-month income minus current-month outcome. This is not the same as total account balance."],
  ["Burn Rate", "The percentage of income already spent. Near or above 100% needs attention."],
  ["Income vs Outcome", "Compare monthly earning and spending trends. Outcome staying below income is the healthy direction."],
  ["Budget Warnings", "Categories at 75% or more of their monthly limit. Red warnings require immediate review."],
  ["Spending Breakdown", "Shows which categories take the largest share of your outcome."],
  ["AI Budget Conclusion", "A transaction-based summary that highlights patterns, risks, and a practical next action."],
  ["Financial Health", "A 0-100 indicator based on savings, budgets, volatility, available balance, and subscriptions."],
  ["Cash Flow Forecast", "An estimate based on current balances, recent daily spending, and upcoming subscriptions; it is guidance, not a guarantee."]
];

export function UserGuideButton({ variant }: { variant: "sidebar" | "floating" }) {
  const [open, setOpen] = useState(false);
  const dialogId = useId();
  const headingId = `${dialogId}-heading`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const trigger = triggerRef.current;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
      trigger?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        title="How to use 8888 Tracker"
        aria-label="Open 8888 Tracker guide"
        aria-expanded={open}
        aria-controls={dialogId}
        onClick={() => setOpen(true)}
        className={cn(
          variant === "sidebar" &&
            "hidden h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition hover:bg-sky-50 hover:text-foreground md:flex",
          variant === "floating" &&
            "fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] left-4 z-30 grid h-14 w-14 place-items-center rounded-full border border-sky-200 bg-white text-sky-700 shadow-lg shadow-sky-100 md:hidden"
        )}
      >
        <BookOpen size={variant === "floating" ? 24 : 18} />
        {variant === "sidebar" ? <span>How to use</span> : null}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[70] grid place-items-center p-3 sm:p-6">
          <button
            type="button"
            aria-label="Close guide"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-slate-950/45"
          />
          <section
            id={dialogId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={headingId}
            className="relative flex max-h-[calc(100svh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-border bg-white shadow-2xl sm:max-h-[88vh]"
          >
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-4 py-4 sm:px-6">
              <div>
                <div className="mb-2 flex items-center gap-2 text-sky-700">
                  <BookOpen size={18} />
                  <p className="text-xs font-semibold uppercase">In-app guide</p>
                </div>
                <h2 id={headingId} className="text-xl font-bold sm:text-2xl">How to use 8888 Tracker</h2>
                <p className="mt-1 text-sm text-muted-foreground">Follow this order for the most accurate dashboard.</p>
              </div>
              <button
                ref={closeRef}
                type="button"
                aria-label="Close guide"
                onClick={() => setOpen(false)}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-sky-50 hover:text-foreground"
              >
                <X size={21} />
              </button>
            </header>

            <div className="overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
              <ol className="space-y-5">
                {setupSteps.map((step, index) => (
                  <li key={step.title} className="grid grid-cols-[2rem_1fr] gap-3 border-b border-border pb-5 last:border-0 last:pb-0">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-sky-100 text-sm font-bold text-sky-700">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="font-semibold">{step.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{step.description}</p>
                      <p className="mt-2 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                        <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-500" />
                        {step.detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="mt-8 border-t border-border pt-6">
                <h3 className="text-lg font-bold">How to read the Dashboard</h3>
                <dl className="mt-4 divide-y divide-border">
                  {dashboardItems.map(([term, description]) => (
                    <div key={term} className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
                      <dt className="text-sm font-semibold">{term}</dt>
                      <dd className="text-sm leading-6 text-muted-foreground">{description}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>

            <footer className="shrink-0 border-t border-border bg-sky-50 px-4 py-3 text-xs leading-5 text-slate-600 sm:px-6">
              Recommended habit: record transactions daily and review Dashboard once a week.
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
