"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  variant?: "default" | "outline";
  size?: "sm" | "default" | "lg";
  className?: string;
}

type StatusType = "success" | "warning" | "danger" | "info" | "neutral";

function getStatusType(status: string): StatusType {
  const normalizedStatus = status.toLowerCase();

  // Success states
  if (["accepted", "paid", "completed", "active", "success", "approved"].includes(normalizedStatus)) {
    return "success";
  }

  // Warning states
  if (["pending", "draft", "warning", "waiting", "overdue"].includes(normalizedStatus)) {
    return "warning";
  }

  // Danger states
  if (["declined", "failed", "error", "cancelled", "voided", "inactive"].includes(normalizedStatus)) {
    return "danger";
  }

  // Info states
  if (["converted", "processed", "sent", "info"].includes(normalizedStatus)) {
    return "info";
  }

  // Default to neutral
  return "neutral";
}

function getStatusClasses(statusType: StatusType, variant: "default" | "outline" = "outline"): string {
  if (variant === "outline") {
    switch (statusType) {
      case "success":
        return "border-emerald-200/70 bg-emerald-50 text-emerald-700";
      case "warning":
        return "border-amber-200/70 bg-amber-50 text-amber-700";
      case "danger":
        return "border-rose-200/70 bg-rose-50 text-rose-700";
      case "info":
        return "border-sky-200/70 bg-sky-50 text-sky-700";
      case "neutral":
      default:
        return "border-zinc-300/70 bg-zinc-50 text-zinc-700";
    }
  }

  // Solid variant
  switch (statusType) {
    case "success":
      return "bg-emerald-600 text-white";
    case "warning":
      return "bg-amber-500 text-white";
    case "danger":
      return "bg-rose-600 text-white";
    case "info":
      return "bg-sky-600 text-white";
    case "neutral":
    default:
      return "bg-zinc-600 text-white";
  }
}

export function StatusBadge({
  status,
  variant = "outline",
  size = "default",
  className
}: StatusBadgeProps) {
  const statusType = getStatusType(status);
  const statusClasses = getStatusClasses(statusType, variant);

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