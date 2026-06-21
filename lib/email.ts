import { Resend } from "resend";
import { formatIDR } from "@/lib/formatters";
import type { BudgetInsight } from "@/lib/ai";

export async function sendWeeklyReportEmail({
  to,
  name,
  weekRange,
  income,
  outcome,
  netSaved,
  subscriptionsDue,
  insight
}: {
  to: string;
  name: string;
  weekRange: string;
  income: number;
  outcome: number;
  netSaved: number;
  subscriptionsDue: { name: string; amount: number }[];
  insight: BudgetInsight;
}) {
  if (!process.env.RESEND_API_KEY) {
    return { skipped: true, reason: "RESEND_API_KEY is not configured." };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;color:#0f172a;line-height:1.6">
      <h1>Your Weekly Money Tracker Report</h1>
      <p>Hi ${name},</p>
      <p>Here is your weekly Money Tracker summary for ${weekRange}.</p>
      <ul>
        <li>Total Income: <strong>${formatIDR(income)}</strong></li>
        <li>Total Outcome: <strong>${formatIDR(outcome)}</strong></li>
        <li>Net Saved: <strong>${formatIDR(netSaved)}</strong></li>
      </ul>
      <h2>Top Spending</h2>
      <ol>${insight.topCategories.map((item) => `<li>${item.category} - ${formatIDR(item.amount)}</li>`).join("")}</ol>
      <h2>Subscriptions Due Soon</h2>
      <ul>${subscriptionsDue.map((item) => `<li>${item.name} - ${formatIDR(item.amount)}</li>`).join("") || "<li>No subscriptions due soon.</li>"}</ul>
      <h2>AI Conclusion</h2>
      <p>${insight.conclusion}</p>
      <h2>Recommended next week budget</h2>
      <ul>
        <li>Needs: ${formatIDR(insight.recommendedBudget.needs)}</li>
        <li>Wants: ${formatIDR(insight.recommendedBudget.wants)}</li>
        <li>Savings/Investing: ${formatIDR(insight.recommendedBudget.savingsInvesting)}</li>
      </ul>
    </div>
  `;

  return resend.emails.send({
    from: "Money Tracker <onboarding@resend.dev>",
    to,
    subject: "Your Weekly Money Tracker Report",
    html
  });
}
