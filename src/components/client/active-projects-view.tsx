"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import { JobStatus as JobStatusEnum } from "@/lib/constants/enums";
import type { JobStatus } from "@/lib/constants/enums";

type FilterKey = "all" | "pendingPrint" | "pendingPayment" | "inProgress";

type ClientJobSummary = {
  id: number;
  title: string;
  status: JobStatus;
  priority: string;
  invoiceId: number;
  invoiceNumber: string | null;
  updatedAt: string;
  createdAt: string;
};

const filterOptions: { label: string; value: FilterKey }[] = [
  { label: "All", value: "all" },
  { label: "Pending Print", value: "pendingPrint" },
  { label: "Pending Payment", value: "pendingPayment" },
  { label: "In Progress", value: "inProgress" },
];

const pendingPrintStatuses = new Set<JobStatus>([
  JobStatusEnum.QUEUED,
  JobStatusEnum.PRE_PROCESSING,
  JobStatusEnum.IN_QUEUE,
]);
const pendingPaymentStatuses = new Set<JobStatus>([
  JobStatusEnum.PRINTING_COMPLETE,
  JobStatusEnum.POST_PROCESSING,
  JobStatusEnum.PACKAGING,
  JobStatusEnum.OUT_FOR_DELIVERY,
  JobStatusEnum.COMPLETED,
]);
const inProgressStatuses = new Set<JobStatus>([
  JobStatusEnum.PRINTING,
  JobStatusEnum.PAUSED,
]);

const filterMap: Record<FilterKey, (project: ClientJobSummary) => boolean> = {
  all: () => true,
  pendingPrint: (project) => pendingPrintStatuses.has(project.status),
  pendingPayment: (project) => pendingPaymentStatuses.has(project.status),
  inProgress: (project) => inProgressStatuses.has(project.status),
};

export function ActiveProjectsView() {
  const [projects, setProjects] = useState<ClientJobSummary[]>([]);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/client/jobs?archived=false");
      if (!response.ok) {
        throw new Error("Failed to load active projects");
      }
      const data = (await response.json()) as ClientJobSummary[] | null;
      setProjects(data ?? []);
    } catch (err) {
      console.error(err);
      setError("Unable to load active projects right now.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const filteredProjects = useMemo(
    () => projects.filter((project) => filterMap[filter](project)),
    [filter, projects],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {filterOptions.map((option) => {
          const isActive = option.value === filter;
          return (
            <button
              key={option.value}
              type="button"
              className={cn(
                "rounded-full border px-4 py-1 text-sm font-semibold transition",
                isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/60 bg-background text-foreground hover:border-primary hover:text-primary",
              )}
              onClick={() => setFilter(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <Card className="border-border/70 bg-card/80">
          <CardContent>
            <p className="text-sm text-muted-foreground">Loading active projects...</p>
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border-destructive/60 bg-destructive/10">
          <CardContent className="space-y-3 text-sm text-destructive">
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={loadProjects}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : filteredProjects.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No projects match that filter right now. Try widening the filter or
              come back later.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="border-border/70 bg-card/80">
              <CardHeader className="gap-4 pb-3">
                <div>
                  <CardTitle className="text-base font-semibold">
                    {project.title}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Updated {formatDistanceToNowStrict(new Date(project.updatedAt), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={project.status} size="sm" />
                  <Badge variant="outline">{project.priority.toLowerCase()}</Badge>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 border-t border-border/70 pt-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    Invoice
                  </p>
                  <Link
                    className="text-sm font-semibold text-primary underline-offset-4 transition hover:underline"
                    href={`/client/orders/${project.invoiceId}`}
                  >
                    {project.invoiceNumber || `#${project.invoiceId}`}
                  </Link>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    Created
                  </p>
                  <p className="text-sm text-foreground">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="sm:col-span-2 flex flex-wrap items-center gap-3 pt-2">
                  <Button size="sm" variant="ghost" asChild>
                    <Link href={`/client/orders/${project.invoiceId}`}>View invoice</Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/quick-order">Start new project</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
