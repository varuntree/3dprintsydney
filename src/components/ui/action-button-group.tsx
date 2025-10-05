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
    primary: "border border-border bg-surface-overlay shadow-sm",
    secondary: "border border-border bg-surface-subtle shadow-sm",
    destructive: "border border-border bg-danger-subtle shadow-sm",
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl p-3",
        variantStyles[variant] ?? variantStyles.secondary,
        className,
      )}
    >
      {(title || meta) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {title ? (
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground/80">
              {title}
            </div>
          ) : null}
          {meta ? <div className="text-xs text-muted-foreground">{meta}</div> : null}
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