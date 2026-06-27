import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/002_security_hardening.sql"),
  "utf8"
);
const aggregateMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/003_secure_dashboard_aggregates.sql"),
  "utf8"
);
const cronRoute = readFileSync(
  resolve(process.cwd(), "app/api/cron/weekly-report/route.ts"),
  "utf8"
);
const aiRoute = readFileSync(
  resolve(process.cwd(), "app/api/ai/budget-insight/route.ts"),
  "utf8"
);

describe("security contract", () => {
  it("keeps balance helpers private and revokes authenticated execution", () => {
    expect(migration).toContain("function private.apply_transaction_balance");
    expect(migration).toContain("function private.reverse_transaction_balance");
    expect(migration).toContain(
      "revoke all privileges on function private.apply_transaction_balance"
    );
    expect(migration).toContain(
      "revoke all privileges on function private.reverse_transaction_balance"
    );
  });

  it("denies direct transaction mutations and grants only authenticated RPC execution", () => {
    expect(migration).toContain("revoke all privileges on public.transactions from authenticated");
    expect(migration).toContain("grant select on public.transactions to authenticated");
    expect(migration).toContain("grant execute on function public.apply_transaction");
    expect(migration).toContain("if v_actor is null or v_actor <> p_user_id");
    expect(migration).toContain("for update");
    expect(migration).toContain("Insufficient balance for transfer.");
  });

  it("requires strict cron authorization and AI quota enforcement", () => {
    expect(cronRoute).toContain("CRON_SECRET is required");
    expect(cronRoute).toContain("safeEqual(auth, `Bearer ${cronSecret}`)");
    expect(cronRoute).not.toContain("vercel-cron/1.0");
    expect(aiRoute).toContain('supabase.rpc("consume_ai_quota")');
    expect(aiRoute).toContain('"Cache-Control": "private, no-store"');
  });

  it("forces RLS and prevents anonymous table access", () => {
    expect(migration).toContain("alter table public.transactions force row level security");
    expect(migration).toContain("alter table public.financial_audit_logs force row level security");
    expect(migration).toContain("revoke all privileges on all tables in schema public from anon");
  });

  it("runs aggregate views as the signed-in caller and denies anonymous access", () => {
    expect(aggregateMigration).toContain("with (security_invoker = true)");
    expect(aggregateMigration).toContain(
      "revoke all privileges on public.monthly_summary from public, anon"
    );
    expect(aggregateMigration).toContain(
      "revoke all privileges on public.category_monthly_spending from public, anon"
    );
  });
});
