"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import { formatRelativeDate } from "@/lib/utils/dates";
import { ClientProjectSummary } from "@/lib/types/dashboard";
import { ClientProjectStatus } from "@/lib/constants/client-project-status";
import { ProjectStatusBadge } from "@/components/projects/project-status-badge";

interface ProjectCardProps {
  project: ClientProjectSummary;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Card className="border border-border bg-surface-overlay">
      <CardHeader className="flex items-start justify-between gap-4">
        <div>
          <CardTitle>{project.title}</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Invoice {project.invoiceNumber ?? "—"} • {formatRelativeDate(project.createdAt)}
          </CardDescription>
          {project.description ? (
            <p className="mt-2 text-sm text-muted-foreground">{project.description}</p>
          ) : null}
        </div>
        <ProjectStatusBadge status={project.clientStatus} />
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="text-lg font-semibold text-foreground">
            {formatCurrency(project.total)}
          </span>
        </div>
        {project.clientStatus === ClientProjectStatus.PENDING_PAYMENT && project.invoiceId ? (
          <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
            <Link href={`/client/orders/${project.invoiceId}`}>Pay Now</Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
