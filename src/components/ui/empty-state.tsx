import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  actions,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border/60 bg-surface-overlay/70 px-6 py-12 text-center shadow-sm shadow-black/5",
        className,
      )}
    >
      {icon ? (
        <div className="flex size-12 items-center justify-center rounded-full border border-border/50 bg-background/80 text-muted-foreground">
          {icon}
        </div>
      ) : null}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
