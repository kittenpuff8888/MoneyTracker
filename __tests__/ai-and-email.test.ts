import { describe, expect, it } from "vitest";
import { generateBudgetInsightFromData } from "../lib/ai";
import { escapeHtml } from "../lib/email";
import type { Account, Transaction } from "../lib/types";

describe("AI grounding and email safety", () => {
  it("builds fallback insight from the current user's actual transaction values", async () => {
    const date = new Date().toISOString().slice(0, 10);
    const insight = await generateBudgetInsightFromData({
      accounts: [{ current_balance: 6_000_000 }] as Account[],
      transactions: [
        { type: "income", amount: 8_000_000, category: "Other", transaction_date: date },
        { type: "outcome", amount: 1_500_000, category: "Lunch", transaction_date: date }
      ] as Transaction[],
      budgets: [],
      subscriptions: [],
      equityAssets: []
    }, "monthly", { useExternalAi: false });

    expect(insight.conclusion).toContain("8.000.000");
    expect(insight.conclusion).toContain("1.500.000");
    expect(insight.conclusion).toContain("Lunch");
    expect(insight.topCategories[0]).toMatchObject({ category: "Lunch", amount: 1_500_000 });
  });

  it("escapes user-controlled values before inserting them into report HTML", () => {
    expect(escapeHtml('<img src=x onerror="alert(1)">')).toBe(
      "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;"
    );
  });
});
