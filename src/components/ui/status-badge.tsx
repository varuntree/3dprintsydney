"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getStatusType, getStatusBadgeClasses, getStatusBadgeSolidClasses } from "@/lib/design-system";

interface StatusBadgeProps {
  status: string;
  variant?: "default" | "outline";
  size?: "sm" | "default" | "lg";
  className?: string;
}

export function StatusBadge({
  status,
  variant = "outline",
  size = "default",
  className
}: StatusBadgeProps) {
  const statusType = getStatusType(status);
  const statusClasses = variant === "outline"
    ? getStatusBadgeClasses(statusType)
    : getStatusBadgeSolidClasses(statusType);

  return (
    <Badge
      variant={variant}
      className={cn(
        "capitalize tracking-wide",
        statusClasses,
        size === "sm" && "text-xs px-1.5 py-0.5",
        size === "lg" && "text-sm px-3 py-1",
        className
      )}
    >
      {status.toLowerCase()}
    </Badge>
  );
}