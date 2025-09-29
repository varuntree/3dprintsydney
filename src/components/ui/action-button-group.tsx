"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ActionButtonGroupProps {
  children: ReactNode;
  title?: string;
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
  variant = "secondary",
  className
}: ActionButtonGroupProps) {
  const variantStyles = {
    primary: "bg-zinc-50 border-zinc-200",
    secondary: "bg-zinc-50 border-zinc-150",
    destructive: "bg-rose-50 border-rose-200"
  };

  return (
    <div className={cn(
      "rounded-lg border p-3 space-y-2",
      variantStyles[variant],
      className
    )}>
      {title && (
        <div className="text-xs uppercase tracking-[0.3em] text-zinc-500 font-medium">
          {title}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {children}
      </div>
    </div>
  );
}

export function ActionGroupContainer({ children, className }: ActionGroupContainerProps) {
  return (
    <div className={cn(
      "flex flex-col gap-3 md:flex-row md:items-start",
      className
    )}>
      {children}
    </div>
  );
}