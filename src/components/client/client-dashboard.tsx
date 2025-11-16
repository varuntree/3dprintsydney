"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeDollarSign, CheckCircle2, CreditCard, Printer } from "lucide-react";

import { formatCurrency } from "@/lib/currency";
import { getJson } from "@/lib/http";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ClientDashboardStats = {
  totalOrders: number;
  pendingCount: number;
  paidCount: number;
  totalSpent: number;
  walletBalance: number;
  projectCounters: {
    pendingPrint: number;
    pendingPayment: number;
    completed: number;
    availableCredit: number;
  };
};

type ClientDashboardProps = {
  initial: ClientDashboardStats;
  userEmail: string;
};

const ACTIONS: Array<{ label: string; href: string; variant: "default" | "outline" }> = [
  { label: "Projects", href: "/client/projects/active", variant: "default" },
  { label: "Quotes", href: "/client/messages", variant: "outline" },
  { label: "Invoices", href: "/client/orders", variant: "outline" },
];

export function ClientDashboard({ initial, userEmail }: ClientDashboardProps) {
  const { data: stats = initial, isLoading } = useQuery({
    queryKey: ["client-dashboard"],
    queryFn: () => getJson<ClientDashboardStats>("/api/client/dashboard"),
    initialData: initial,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const pendingPayment = stats.projectCounters.pendingPayment;
  const pendingPrint = stats.projectCounters.pendingPrint;
  const completed = stats.projectCounters.completed;
  const availableCredit = formatCurrency(stats.projectCounters.availableCredit ?? stats.walletBalance ?? 0);

  const cards = [
    {
      label: "Available Credit",
      helper: "Total client wallet balance ready to spend",
      value: availableCredit,
      icon: BadgeDollarSign,
    },
    {
      label: "Pending Payment",
      helper: "Projects waiting on funds",
      value: `${pendingPayment.toLocaleString()} project${pendingPayment === 1 ? "" : "s"}`,
      icon: CreditCard,
    },
    {
      label: "Pending Print",
      helper: "Jobs queued or on printers",
      value: `${pendingPrint.toLocaleString()} job${pendingPrint === 1 ? "" : "s"}`,
      icon: Printer,
    },
    {
      label: "Total Completed",
      helper: "Projects delivered via QuickPrint",
      value: `${completed.toLocaleString()}`,
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground/70">
          Client Dashboard
        </p>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Welcome back, {userEmail}
          </h1>
          <p className="text-sm text-muted-foreground">
            Start a new project or track progress.
          </p>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.label}
              className="rounded-3xl border border-border/70 bg-card/90 shadow-sm shadow-black/5"
            >
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <CardTitle className="space-y-1">
                  <p className="text-sm font-semibold text-muted-foreground">{card.label}</p>
                  <p className="text-xs text-muted-foreground/80">{card.helper}</p>
                </CardTitle>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted text-muted-foreground">
                  <Icon className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-foreground">
                  {isLoading ? "…" : card.value}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <div className="flex flex-wrap gap-2">
        {ACTIONS.map((action) => (
          <Button
            key={action.href}
            asChild
            variant={action.variant}
            size="lg"
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold",
              action.variant === "outline" && "bg-surface-overlay/80",
            )}
          >
            <Link href={action.href}>
              <ArrowRight className="-ml-0.5 mr-2 inline h-4 w-4" />
              {action.label}
            </Link>
          </Button>
        ))}
      </div>
    </div>
  );
}
