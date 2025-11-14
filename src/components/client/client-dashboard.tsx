"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Rocket, Clock, Repeat2 } from "lucide-react";

import type { LegacyUser } from "@/lib/types/user";
import type { ClientDashboardStats } from "@/lib/types/dashboard";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";

type ClientDashboardProps = {
  user: LegacyUser;
};

type CtaConfig = {
  key: string;
  title: string;
  description: string;
  href: string;
  icon: typeof Rocket;
  badge: (stats: ClientDashboardStats | null) => string | null;
};

const CTA_ITEMS: CtaConfig[] = [
  {
    key: "new",
    title: "New Project",
    description: "Start a QuickPrint project with fresh files.",
    href: "/quick-order",
    icon: Rocket,
    badge: (stats) =>
      stats ? formatCurrency(stats.projectCounters.availableCredit ?? 0) : null,
  },
  {
    key: "active",
    title: "Active Projects",
    description: "Track progress across everything in flight.",
    href: "/client/projects/active",
    icon: Clock,
    badge: (stats) =>
      stats ? `${stats.projectCounters.pendingPrint ?? 0} in progress` : null,
  },
  {
    key: "again",
    title: "Print Again",
    description: "Reprint a finished project in one tap.",
    href: "/client/projects/history",
    icon: Repeat2,
    badge: (stats) =>
      stats ? `${stats.projectCounters.completed ?? 0} completed` : null,
  },
];

export function ClientDashboard({ user }: ClientDashboardProps) {
  const [stats, setStats] = useState<ClientDashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [isFirstVisit, setIsFirstVisit] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadStats() {
      try {
        const response = await fetch("/api/client/dashboard");
        if (!response.ok) throw new Error("Failed to load dashboard stats");
        const payload = (await response.json()) as { data: ClientDashboardStats };
        if (!active) return;
        setStats(payload.data);
      } catch (error) {
        console.error("client-dashboard.stats", error);
      } finally {
        if (active) setLoadingStats(false);
      }
    }

    loadStats();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    if (typeof window === "undefined") return;
    const storageKey = `quickprint-client-welcomed-${user.id}`;
    const seen = window.localStorage.getItem(storageKey);
    setIsFirstVisit(!seen);
    if (!seen) {
      window.localStorage.setItem(storageKey, "1");
    }
  }, [user?.id]);

  const greeting = useMemo(() => {
    const displayName = user?.name || user?.email || "there";
    return isFirstVisit ? "Welcome to QuickPrint" : `Welcome back to QuickPrint, ${displayName}`;
  }, [isFirstVisit, user?.email, user?.name]);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">{greeting}</h1>
        <p className="text-sm text-muted-foreground">Start a new project or track progress.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {CTA_ITEMS.map(({ key, title, description, href, icon: Icon, badge }) => {
          const badgeValue = badge(stats);
          return (
            <Link
              key={key}
              href={href}
              className={cn(
                "group flex h-full flex-col justify-between rounded-3xl border border-border/70 bg-surface-overlay/95 p-5",
                "shadow-sm shadow-black/5 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
              )}
            >
              <div className="flex items-center justify-between gap-4">
                <span className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                {badgeValue ? (
                  <span className="text-sm font-semibold text-muted-foreground group-hover:text-primary">
                    {badgeValue}
                  </span>
                ) : null}
              </div>
              <div className="space-y-2 pt-6">
                <h3 className="text-xl font-semibold text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
              <span className="pt-6 text-sm font-semibold text-primary">{loadingStats ? "Loading…" : "Open"}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
