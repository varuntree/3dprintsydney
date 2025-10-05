/**
 * Centralized Design System Utilities
 *
 * This file provides TypeScript utilities for working with the design system.
 * All color mappings, status logic, and tone configurations are centralized here.
 */

/**
 * Status types used across the application
 */
export type StatusType = "success" | "warning" | "danger" | "info" | "neutral";

/**
 * Tone types for metric cards and visual emphasis
 */
export type ToneType = "emerald" | "sky" | "amber" | "slate";

/**
 * Status value mappings for various entities
 */
export const STATUS_MAPPINGS = {
  // Invoice/Payment statuses
  PAID: "success",
  COMPLETED: "success",
  ACTIVE: "success",
  APPROVED: "success",
  ACCEPTED: "success",

  PENDING: "warning",
  DRAFT: "warning",
  WAITING: "warning",
  OVERDUE: "warning",

  DECLINED: "danger",
  FAILED: "danger",
  CANCELLED: "danger",
  VOIDED: "danger",
  INACTIVE: "danger",

  CONVERTED: "info",
  PROCESSED: "info",
  SENT: "info",

  // Printer statuses
  MAINTENANCE: "warning",
  OFFLINE: "neutral",
} as const;

/**
 * Get the semantic status type for any status string
 */
export function getStatusType(status: string): StatusType {
  const normalizedStatus = status.toUpperCase().replace(/\s+/g, "_");

  // Check if it's in our mappings
  if (normalizedStatus in STATUS_MAPPINGS) {
    return STATUS_MAPPINGS[normalizedStatus as keyof typeof STATUS_MAPPINGS] as StatusType;
  }

  // Fallback logic for unknown statuses
  const statusLower = status.toLowerCase();

  if (["accepted", "paid", "completed", "active", "success", "approved"].includes(statusLower)) {
    return "success";
  }

  if (["pending", "draft", "warning", "waiting", "overdue"].includes(statusLower)) {
    return "warning";
  }

  if (["declined", "failed", "error", "cancelled", "voided", "inactive"].includes(statusLower)) {
    return "danger";
  }

  if (["converted", "processed", "sent", "info"].includes(statusLower)) {
    return "info";
  }

  return "neutral";
}

/**
 * CSS class names for status badge variants (outline style)
 * Uses centralized design tokens
 */
export function getStatusBadgeClasses(statusType: StatusType): string {
  const baseClasses = "border bg-opacity-50";

  switch (statusType) {
    case "success":
      return `${baseClasses} border-[var(--color-success-border)] bg-[var(--color-success-bg)] text-[var(--color-success-dark)]`;
    case "warning":
      return `${baseClasses} border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] text-[var(--color-warning-dark)]`;
    case "danger":
      return `${baseClasses} border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] text-[var(--color-danger-dark)]`;
    case "info":
      return `${baseClasses} border-[var(--color-info-border)] bg-[var(--color-info-bg)] text-[var(--color-info-dark)]`;
    case "neutral":
    default:
      return `${baseClasses} border-[var(--color-neutral-border)] bg-[var(--color-neutral-bg)] text-[var(--color-neutral-dark)]`;
  }
}

/**
 * CSS class names for status badge solid variants
 */
export function getStatusBadgeSolidClasses(statusType: StatusType): string {
  switch (statusType) {
    case "success":
      return "bg-[var(--color-success)] text-white";
    case "warning":
      return "bg-[var(--color-warning)] text-white";
    case "danger":
      return "bg-[var(--color-danger)] text-white";
    case "info":
      return "bg-[var(--color-info)] text-white";
    case "neutral":
    default:
      return "bg-[var(--color-neutral)] text-white";
  }
}

/**
 * Metric card tone configuration
 * Centralized mapping for all tone-based styling
 */
export interface ToneConfig {
  border: string;
  pill: string;
  gradient: string;
  value: string;
}

export const TONE_CONFIGS: Record<ToneType, ToneConfig> = {
  emerald: {
    border: "border-[var(--tone-emerald-border)]",
    pill: "bg-[var(--tone-emerald-pill-bg)] text-[var(--tone-emerald-pill-text)]",
    gradient: "from-[var(--tone-emerald-bg)] via-[var(--tone-emerald-bg)]/50 to-transparent",
    value: "text-[var(--tone-emerald-value)]",
  },
  sky: {
    border: "border-[var(--tone-sky-border)]",
    pill: "bg-[var(--tone-sky-pill-bg)] text-[var(--tone-sky-pill-text)]",
    gradient: "from-[var(--tone-sky-bg)] via-[var(--tone-sky-bg)]/50 to-transparent",
    value: "text-[var(--tone-sky-value)]",
  },
  amber: {
    border: "border-[var(--tone-amber-border)]",
    pill: "bg-[var(--tone-amber-pill-bg)] text-[var(--tone-amber-pill-text)]",
    gradient: "from-[var(--tone-amber-bg)] via-[var(--tone-amber-bg)]/50 to-transparent",
    value: "text-[var(--tone-amber-value)]",
  },
  slate: {
    border: "border-[var(--tone-slate-border)]",
    pill: "bg-[var(--tone-slate-pill-bg)] text-[var(--tone-slate-pill-text)]",
    gradient: "from-[var(--tone-slate-bg)] via-[var(--tone-slate-bg)]/60 to-transparent",
    value: "text-[var(--tone-slate-value)]",
  },
};

/**
 * Get tone configuration for a metric card
 */
export function getToneConfig(tone: ToneType): ToneConfig {
  return TONE_CONFIGS[tone];
}

/**
 * Chart color mapping for status-based visualizations
 */
export const CHART_COLORS: Record<string, string> = {
  PENDING: "var(--color-info)",
  ACCEPTED: "var(--color-success)",
  CONVERTED: "#8B5CF6", // Purple
  DECLINED: "var(--color-danger)",
  DRAFT: "var(--color-neutral)",
};

/**
 * Get chart color for a status
 */
export function getChartColor(status: string): string {
  return CHART_COLORS[status] || "var(--color-neutral)";
}

/**
 * Activity dot colors for timeline/activity feeds
 */
export interface ActivityStyle {
  dot: string;
  badge: string;
}

export const ACTIVITY_STYLES: Record<string, ActivityStyle> = {
  PENDING: {
    dot: "bg-[var(--color-info)] ring-[var(--color-info-border)]",
    badge: "border-[var(--color-info-border)] text-[var(--color-info-dark)]",
  },
  ACCEPTED: {
    dot: "bg-[var(--color-success)] ring-[var(--color-success-border)]",
    badge: "border-[var(--color-success-border)] text-[var(--color-success-dark)]",
  },
  PAID: {
    dot: "bg-[var(--color-success)] ring-[var(--color-success-border)]",
    badge: "border-[var(--color-success-border)] text-[var(--color-success-dark)]",
  },
  OVERDUE: {
    dot: "bg-[var(--color-warning)] ring-[var(--color-warning-border)]",
    badge: "border-[var(--color-warning-border)] text-[var(--color-warning-dark)]",
  },
  DECLINED: {
    dot: "bg-[var(--color-danger)] ring-[var(--color-danger-border)]",
    badge: "border-[var(--color-danger-border)] text-[var(--color-danger-dark)]",
  },
  CONVERTED: {
    dot: "bg-[#8B5CF6] ring-[#DDD6FE]",
    badge: "border-[#DDD6FE] text-[#7C3AED]",
  },
  DRAFT: {
    dot: "bg-[var(--color-neutral)] ring-[var(--color-neutral-border)]",
    badge: "border-[var(--color-neutral-border)] text-[var(--color-neutral-dark)]",
  },
};

/**
 * Get activity styling for status
 */
export function getActivityStyle(status: string): ActivityStyle {
  const normalized = status.toUpperCase();
  return ACTIVITY_STYLES[normalized] || ACTIVITY_STYLES.DRAFT;
}

/**
 * Progress bar color based on percentage
 */
export function getProgressColor(percentage: number): string {
  if (percentage >= 80) return "var(--color-success)";
  if (percentage >= 50) return "var(--color-info)";
  if (percentage >= 25) return "var(--color-warning)";
  return "var(--color-danger)";
}

/**
 * Icon size classes
 */
export const ICON_SIZES = {
  sm: "size-4",  // 16px
  md: "size-5",  // 20px
  lg: "size-6",  // 24px
  xl: "size-8",  // 32px
} as const;

/**
 * Common animation classes
 */
export const ANIMATIONS = {
  fadeIn: "animate-fade-in",
  slideIn: "animate-slide-in",
  hoverLift: "transition-transform hover:-translate-y-1",
} as const;