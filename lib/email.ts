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
  const safeName = escapeHtml(name);
  const safeWeekRange = escapeHtml(weekRange);
  const safeConclusion = escapeHtml(insight.conclusion).replaceAll("\n", "<br>");
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;color:#0f172a;line-height:1.6">
      <h1>Your Weekly 8888 Tracker Report</h1>
      <p>Hi ${safeName},</p>
      <p>Here is your weekly 8888 Tracker summary for ${safeWeekRange}.</p>
      <ul>
        <li>Total Income: <strong>${formatIDR(income)}</strong></li>
        <li>Total Outcome: <strong>${formatIDR(outcome)}</strong></li>
        <li>Net Saved: <strong>${formatIDR(netSaved)}</strong></li>
      </ul>
      <h2>Top Spending</h2>
      <ol>${insight.topCategories.map((item) => `<li>${escapeHtml(item.category)} - ${formatIDR(item.amount)}</li>`).join("")}</ol>
      <h2>Overspending Warnings</h2>
      <ul>${insight.overspendingWarnings.map((item) => `<li>${escapeHtml(item.category)} increased by ${Math.round(item.increase)}% (${formatIDR(item.amount)} this week)</li>`).join("") || "<li>No overspending spikes detected this week.</li>"}</ul>
      <h2>Subscriptions Due Soon</h2>
      <ul>${subscriptionsDue.map((item) => `<li>${escapeHtml(item.name)} - ${formatIDR(item.amount)}</li>`).join("") || "<li>No subscriptions due soon.</li>"}</ul>
      <h2>AI Conclusion</h2>
      <p>${safeConclusion}</p>
      <h2>Recommended next week budget</h2>
      <ul>
        <li>Needs: ${formatIDR(insight.recommendedBudget.needs)}</li>
        <li>Wants: ${formatIDR(insight.recommendedBudget.wants)}</li>
        <li>Savings/Investing: ${formatIDR(insight.recommendedBudget.savingsInvesting)}</li>
      </ul>
    </div>
  `;

  return resend.emails.send({
    from: process.env.REPORT_FROM_EMAIL ?? "8888 Tracker <onboarding@resend.dev>",
    to,
    subject: "Your Weekly 8888 Tracker Report",
    html
  });
}

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
