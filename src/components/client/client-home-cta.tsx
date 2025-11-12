"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Plus, Repeat } from "lucide-react";
import { formatCurrency } from "@/lib/currency";

type ProjectCounters = {
  pendingPrint: number;
  pendingPayment: number;
  completed: number;
  availableCredit: number;
};

interface ClientHomeCTAProps {
  projectCounters?: ProjectCounters;
}

export function ClientHomeCTA({ projectCounters }: ClientHomeCTAProps) {
  const pendingPrint = projectCounters?.pendingPrint ?? 0;
  const pendingPayment = projectCounters?.pendingPayment ?? 0;
  const completed = projectCounters?.completed ?? 0;
  const availableCredit = projectCounters?.availableCredit ?? 0;
  const activeBadge = pendingPrint + pendingPayment > 0 ? `${pendingPrint + pendingPayment} active` : null;
  const historyBadge = completed > 0 ? `${completed} past projects` : null;

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <Card className="border border-border bg-surface-overlay/80">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-primary/10 p-2 text-primary">
              <Plus className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base">New Project</CardTitle>
              <CardDescription className="text-muted-foreground">
                Upload files, lock in pricing, and instantly kickstart a new print.
              </CardDescription>
              <div className="mt-2 text-sm font-semibold text-foreground">
                Available credit: {formatCurrency(availableCredit)}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardFooter>
          <Button asChild className="w-full" size="sm">
            <Link href="/quick-order">Start a new project</Link>
          </Button>
        </CardFooter>
      </Card>

      <Card className="border border-border bg-surface-overlay/80">
        <CardHeader className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-slate-100 p-2 text-slate-600">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base">Active Projects</CardTitle>
              <CardDescription className="text-muted-foreground">
                Monitor what&apos;s currently in production.
              </CardDescription>
            </div>
          </div>
          {activeBadge ? (
            <Badge className="text-[11px] font-semibold uppercase tracking-[0.35em]">{activeBadge}</Badge>
          ) : null}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Pending Print</p>
              <p className="text-2xl font-semibold text-foreground">{pendingPrint}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Pending Payment</p>
              <p className="text-2xl font-semibold text-foreground">{pendingPayment}</p>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button asChild variant="outline" className="w-full" size="sm">
            <Link href="/client/projects/active">View active projects</Link>
          </Button>
        </CardFooter>
      </Card>

      <Card className="border border-border bg-surface-overlay/80">
        <CardHeader className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-slate-100 p-2 text-slate-600">
              <Repeat className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base">Print Again</CardTitle>
              <CardDescription className="text-muted-foreground">
                Reorder from your most successful projects.
              </CardDescription>
            </div>
          </div>
          {historyBadge ? (
            <Badge className="text-[11px] font-semibold uppercase tracking-[0.35em]">{historyBadge}</Badge>
          ) : null}
        </CardHeader>
        <CardFooter>
          <Button asChild variant="outline" className="w-full" size="sm">
            <Link href="/client/projects/history">Reorder a past project</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
