import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { getToneConfig, type ToneType } from "@/lib/design-system";

interface MetricCardProps {
  readonly label: ReactNode;
  readonly value: ReactNode;
  readonly helper?: ReactNode;
  readonly tone?: ToneType;
  readonly className?: string;
}

export function MetricCard({
  label,
  value,
  helper,
  tone = "slate",
  className,
}: MetricCardProps) {
  const toneConfig = getToneConfig(tone);

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-3xl border bg-card/90 p-6 shadow-sm shadow-black/5 transition-colors duration-200",
        toneConfig.border,
        className,
      )}
      role="region"
      aria-labelledby="metric-card-label"
    >
      <span
        className={cn(
          "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100",
          "bg-gradient-to-br",
          toneConfig.gradient,
        )}
        aria-hidden="true"
      />
      <div className="relative flex flex-col gap-4">
        <span
          id="metric-card-label"
          className={cn("w-fit rounded-full px-3 py-1 text-xs font-medium", toneConfig.pill)}
        >
          {label}
        </span>
        <div className={cn("text-3xl font-semibold tracking-tight", toneConfig.value)}>
          {value}
        </div>
        {helper ? (
          <p className="text-sm text-muted-foreground">{helper}</p>
        ) : null}
      </div>
    </div>
  );
}