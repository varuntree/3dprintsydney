"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ClientProjectStatus } from "@/lib/constants/client-project-status";

const STATUS_CONFIG: Record<
  ClientProjectStatus,
  { label: string; className: string }
> = {
  [ClientProjectStatus.PENDING_PRINT]: {
    label: "Pending Print",
    className: "bg-blue-100 text-blue-800",
  },
  [ClientProjectStatus.PENDING_PAYMENT]: {
    label: "Pending Payment",
    className: "bg-amber-100 text-amber-800",
  },
  [ClientProjectStatus.COMPLETED]: {
    label: "Completed",
    className: "bg-emerald-100 text-emerald-800",
  },
};

interface ProjectStatusBadgeProps {
  status: ClientProjectStatus;
}

export function ProjectStatusBadge({ status }: ProjectStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge className={cn("text-xs font-semibold uppercase tracking-[0.25em]", config.className)}>
      {config.label}
    </Badge>
  );
}
