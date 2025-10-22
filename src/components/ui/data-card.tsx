import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DataCardProps {
  readonly title: ReactNode;
  readonly value: ReactNode;
  readonly description?: ReactNode;
  readonly icon?: ReactNode;
  readonly tone?: "emerald" | "sky" | "amber" | "slate";
  readonly className?: string;
}

const toneStyles: Record<string, { border: string; value: string; icon: string }> = {
  emerald: {
    border: "border-emerald-200/70",
    value: "text-emerald-700",
    icon: "text-emerald-600",
  },
  sky: {
    border: "border-sky-200/70",
    value: "text-sky-700",
    icon: "text-sky-600",
  },
  amber: {
    border: "border-amber-200/70",
    value: "text-amber-800",
    icon: "text-amber-600",
  },
  slate: {
    border: "border-border/60",
    value: "text-foreground",
    icon: "text-muted-foreground",
  },
};

/**
 * DataCard - Mobile optimized
 * - Reduced padding on mobile: p-4, sm:p-6
 * - Responsive border radius: rounded-2xl on mobile, rounded-3xl on sm+
 * - Smaller value text on mobile: text-2xl, sm:text-3xl
 * - Tighter spacing on mobile for better content density
 */
export function DataCard({
  title,
  value,
  description,
  icon,
  tone = "slate",
  className,
}: DataCardProps) {
  const styles = toneStyles[tone];

  return (
    <div
      className={cn(
        "rounded-2xl border bg-surface-overlay shadow-sm shadow-black/5 p-4 sm:rounded-3xl sm:p-6",
        styles.border,
        className,
      )}
      role="region"
      aria-labelledby="data-card-title"
    >
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="flex-1 space-y-3 sm:space-y-4">
          <div className="space-y-1.5 sm:space-y-2">
            <p
              id="data-card-title"
              className="text-xs uppercase tracking-[0.2em] text-muted-foreground/80 font-medium"
            >
              {title}
            </p>
            <div className={cn("text-2xl font-semibold tracking-tight sm:text-3xl", styles.value)}>
              {value}
            </div>
          </div>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {icon ? (
          <div className={cn("flex-shrink-0", styles.icon)} aria-hidden="true">
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );
}