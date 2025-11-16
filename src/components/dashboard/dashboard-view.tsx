"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgeDollarSign,
  CheckCircle2,
  CreditCard,
  Printer,
} from "lucide-react";

import { formatCurrency } from "@/lib/currency";
import { getJson } from "@/lib/http";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ClientProjectCounters } from "@/lib/types/dashboard";

export type DashboardClientSnapshot = {
  metrics: {
    revenue30: number;
    revenue30Prev: number;
    outstandingBalance: number;
    availableCredit: number;
    pendingQuotes: number;
    jobsQueued: number;
    jobsPrinting: number;
    jobsCompleted: number;
  };
  revenueTrend: { month: string; value: number }[];
  quoteStatus: { status: string; count: number }[];
  jobSummary: {
    printerId: number | null;
    printerName: string;
    queued: number;
    active: number;
  }[];
  outstandingInvoices: {
    id: number;
    number: string;
    clientName: string;
    dueDate: string | null;
    balanceDue: number;
  }[];
  recentActivity: {
    id: number;
    action: string;
    message: string;
    createdAt: string;
    context: string;
  }[];
  recentActivityNextOffset: number | null;
  projectCounters: ClientProjectCounters;
};

type DashboardViewProps = {
  initial: DashboardClientSnapshot;
  userEmail?: string;
};

const DEFAULT_RANGE = "30d" as const;

export function DashboardView({ initial, userEmail }: DashboardViewProps) {
  const { data: snapshot = initial, isLoading } = useQuery({
    queryKey: ["dashboard", DEFAULT_RANGE],
    queryFn: () =>
      getJson<DashboardClientSnapshot>(
        `/api/dashboard?range=${DEFAULT_RANGE}&actLimit=0&actOffset=0`,
      ),
    initialData: initial,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const counters = snapshot.projectCounters ?? {
    availableCredit: snapshot.metrics.availableCredit ?? 0,
    pendingPayment: snapshot.outstandingInvoices.length,
    pendingPrint: snapshot.metrics.jobsQueued + snapshot.metrics.jobsPrinting,
    completed: snapshot.metrics.jobsCompleted ?? 0,
  };

  const stats = [
    {
      label: "Available Credit",
      helper: "Total client wallet balance ready to spend",
      value: formatCurrency(counters.availableCredit ?? 0),
      icon: BadgeDollarSign,
    },
    {
      label: "Pending Payment",
      helper: "Projects waiting on funds",
      value: `${(counters.pendingPayment ?? 0).toLocaleString()} project${counters.pendingPayment === 1 ? "" : "s"}`,
      icon: CreditCard,
    },
    {
      label: "Pending Print",
      helper: "Jobs queued or on printers",
      value: `${(counters.pendingPrint ?? 0).toLocaleString()} job${counters.pendingPrint === 1 ? "" : "s"}`,
      icon: Printer,
    },
    {
      label: "Total Completed",
      helper: "Projects delivered via QuickPrint",
      value: `${(counters.completed ?? 0).toLocaleString()}`,
      icon: CheckCircle2,
    },
  ];

  const quickLinks = [
    { label: "Projects", href: "/jobs", variant: "default" as const },
    { label: "Quotes", href: "/quotes", variant: "outline" as const },
    { label: "Invoices", href: "/invoices", variant: "outline" as const },
  ];

  const greeting = userEmail ? `Welcome back to QuickPrint, ${userEmail}` : "Welcome back to QuickPrint";

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground/70">
          Admin Dashboard
        </p>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {greeting}
          </h1>
          <p className="text-sm text-muted-foreground">
            Start a new project or track progress.
          </p>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              className="rounded-3xl border border-border/70 bg-card/90 shadow-sm shadow-black/5"
            >
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <CardTitle className="space-y-1">
                  <p className="text-sm font-semibold text-muted-foreground">{stat.label}</p>
                  <p className="text-xs text-muted-foreground/80">{stat.helper}</p>
                </CardTitle>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted text-muted-foreground">
                  <Icon className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-foreground">
                  {isLoading ? "…" : stat.value}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <div className="flex flex-wrap gap-2">
        {quickLinks.map((link) => (
          <Button
            key={link.href}
            asChild
            variant={link.variant}
            size="lg"
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold",
              link.variant === "outline" && "bg-surface-overlay/80",
            )}
          >
            <Link href={link.href}>
              <ArrowRight className="-ml-0.5 mr-2 inline h-4 w-4" />
              {link.label}
            </Link>
          </Button>
        ))}
      </div>
    </div>
  );
}
