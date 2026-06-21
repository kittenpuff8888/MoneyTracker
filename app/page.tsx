import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BarChart3, BellRing, Bot, CalendarClock, CreditCard, LineChart, MoveRight, PiggyBank, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { LoginButton } from "@/components/auth/LoginButton";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";

const features = [
  { title: "Real-Time Overview", icon: BarChart3 },
  { title: "Smart Budget Tracking", icon: PiggyBank },
  { title: "AI Insights", icon: Bot },
  { title: "Upcoming Bills", icon: BellRing },
  { title: "Transfer / Move Money", icon: MoveRight },
  { title: "Equity Tracker", icon: LineChart },
  { title: "Weekly Email Reports", icon: CalendarClock },
  { title: "IDR-First Personal Finance", icon: CreditCard }
];

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-white text-foreground">
      <section className="sky-grid relative overflow-hidden bg-gradient-to-b from-sky-50 to-white">
        <div className="mx-auto grid min-h-[760px] max-w-7xl gap-12 px-6 py-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
          <div>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-4 py-2 text-sm font-semibold text-sky-700">
              <ShieldCheck size={16} />
              Personal finance for Indonesian Rupiah
            </div>
            <h1 className="max-w-3xl text-5xl font-bold leading-tight tracking-normal md:text-7xl">
              Take Control of Your Money.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              Track income, outcome, transfers, subscriptions, savings, budgets, and investments in one intelligent IDR dashboard.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LoginButton />
              <Link href="#demo">
                <Button variant="secondary" className="h-12 px-6">
                  Watch Demo
                  <ArrowRight size={17} />
                </Button>
              </Link>
            </div>
          </div>
          <div id="demo" className="relative">
            <div className="absolute -inset-6 rounded-[2rem] bg-sky-200/45 blur-3xl" />
            <div className="relative overflow-hidden rounded-xl border border-sky-100 bg-white p-2 shadow-soft">
              <Image
                src="/references/acru-dashboard.webp"
                alt="Money Tracker dashboard preview"
                width={1400}
                height={920}
                priority
                className="rounded-lg object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardContent>
              <p className="text-sm font-semibold text-sky-700">Problem</p>
              <h2 className="mt-3 text-3xl font-bold">Money is scattered across wallets, banks, e-wallets, and investment accounts.</h2>
              <p className="mt-4 leading-7 text-muted-foreground">
                Without user-specific transaction history and budgets, it is hard to know where IDR is going, which category is overspending, and how much can safely be saved.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-sm font-semibold text-sky-700">Solution</p>
              <h2 className="mt-3 text-3xl font-bold">One clean dashboard for daily spending, goals, subscriptions, and investments.</h2>
              <p className="mt-4 leading-7 text-muted-foreground">
                Money Tracker uses Supabase auth and RLS so each Gmail account sees only its own accounts, transactions, budgets, assets, and reports.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="bg-sky-50 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-3xl font-bold">Everything needed to understand your month</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title}>
                  <CardContent>
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                      <Icon size={20} />
                    </div>
                    <h3 className="font-semibold">{feature.title}</h3>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <h2 className="text-3xl font-bold">How it works</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {["Login with Gmail", "Add accounts and transactions", "See personalized dashboard and weekly reports"].map((step, index) => (
            <Card key={step}>
              <CardContent>
                <span className="text-sm font-bold text-sky-700">0{index + 1}</span>
                <p className="mt-3 text-lg font-semibold">{step}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
