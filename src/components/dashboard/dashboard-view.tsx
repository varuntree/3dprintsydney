"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PiggyBank, CreditCard, Printer, BadgeCheck, ArrowRight } from "lucide-react";

import { getJson } from "@/lib/http";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import type { ClientProjectCounters } from "@/lib/types/dashboard";
import type { LegacyUser } from "@/lib/types/user";

export type DashboardClientSnapshot = {
  metrics: {
    revenue30: number;
    revenue30Prev: number;
    outstandingBalance: number;
    pendingQuotes: number;
    jobsQueued: number;
    jobsPrinting: number;
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

const DEFAULT_RANGE = "30d" as const;

const COUNTER_CONFIG: Array<{
  key: keyof ClientProjectCounters;
  label: string;
  helper: string;
  icon: typeof PiggyBank;
  format: (value: number) => string;
}> = [
  {
    key: "availableCredit",
    label: "Available Credit",
    helper: "Total client wallet balance ready to spend",
    icon: PiggyBank,
    format: (value) => formatCurrency(value),
  },
  {
    key: "pendingPayment",
    label: "Pending Payment",
    helper: "Projects waiting on funds",
    icon: CreditCard,
    format: (value) => `${value.toLocaleString()} projects`,
  },
  {
    key: "pendingPrint",
    label: "Pending Print",
    helper: "Jobs queued or on printers",
    icon: Printer,
    format: (value) => `${value.toLocaleString()} jobs`,
  },
  {
    key: "completed",
    label: "Total Completed",
    helper: "Projects delivered via QuickPrint",
    icon: BadgeCheck,
    format: (value) => `${value.toLocaleString()}`,
  },
];

export function DashboardView({
  initial,
  user,
}: {
  initial: DashboardClientSnapshot;
  user: LegacyUser;
}) {
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
  const [isFirstVisit, setIsFirstVisit] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    if (typeof window === "undefined") return;
    const key = `quickprint-admin-welcomed-${user.id}`;
    const seen = window.localStorage.getItem(key);
    setIsFirstVisit(!seen);
    if (!seen) {
      window.localStorage.setItem(key, "1");
    }
  }, [user?.id]);

  const greeting = useMemo(() => {
    const displayName = user?.name || user?.email || "there";
    return isFirstVisit ? "Welcome to QuickPrint" : `Welcome back to QuickPrint, ${displayName}`;
  }, [isFirstVisit, user?.email, user?.name]);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground/70">
          Admin Dashboard
        </p>
        <h1 className="text-3xl font-bold text-foreground">{greeting}</h1>
        <p className="text-sm text-muted-foreground">Start a new project or track progress.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COUNTER_CONFIG.map(({ key, label, helper, icon: Icon, format }) => {
          const value = snapshot.projectCounters[key];
          return (
            <Card key={key} className="rounded-3xl border border-border/70 bg-card/90">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-sm font-semibold text-muted-foreground">{label}</CardTitle>
                  <p className="text-xs text-muted-foreground/70">{helper}</p>
                </div>
                <span className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-foreground">
                  {isLoading ? "…" : format(value)}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="flex flex-wrap gap-3">
        <Button asChild size="lg" className="gap-2 rounded-2xl">
          <Link href="/clients">
            <ArrowRight className="h-4 w-4" /> Projects
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="gap-2 rounded-2xl">
          <Link href="/quotes">
            <ArrowRight className="h-4 w-4" /> Quotes
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="gap-2 rounded-2xl">
          <Link href="/invoices">
            <ArrowRight className="h-4 w-4" /> Invoices
          </Link>
        </Button>
      </section>
    </div>
  );
}
