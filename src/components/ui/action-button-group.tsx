"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ActionButtonGroupProps {
  children: ReactNode;
  title?: ReactNode;
  meta?: ReactNode;
  variant?: "primary" | "secondary" | "destructive";
  className?: string;
}

interface ActionGroupContainerProps {
  children: ReactNode;
  className?: string;
}

export function ActionButtonGroup({
  children,
  title,
  meta,
  variant = "secondary",
  className,
}: ActionButtonGroupProps) {
  const variantStyles: Record<string, string> = {
    primary:
      "border border-border/60 bg-gradient-to-br from-primary/[0.08] via-surface-overlay to-surface-overlay text-foreground shadow-sm shadow-black/5 backdrop-blur",
    secondary:
      "border border-border/60 bg-surface-subtle/90 text-foreground shadow-sm shadow-black/5",
    destructive:
      "border border-danger/40 bg-danger-subtle/90 text-foreground shadow-sm shadow-danger/10",
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl p-3 transition-colors",
        variantStyles[variant] ?? variantStyles.secondary,
        className,
      )}
    >
      {(title || meta) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {title ? (
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground/70">
              {title}
            </div>
          ) : null}
          {meta ? (
            <div className="text-xs font-medium text-muted-foreground/80">
              {meta}
            </div>
          ) : null}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export function ActionGroupContainer({ children, className }: ActionGroupContainerProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 md:flex-row md:items-start md:gap-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
