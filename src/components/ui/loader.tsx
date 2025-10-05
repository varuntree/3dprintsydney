"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

interface LoaderProps {
  readonly label?: ReactNode;
  readonly className?: string;
  readonly size?: number;
}

export function Loader({ label, className, size = 20 }: LoaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-3 rounded-md border border-dashed border-border/70 bg-surface-overlay px-4 py-6 text-sm text-muted-foreground",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy
    >
      <Loader2 className="animate-spin text-primary" style={{ width: size, height: size }} />
      {label ? <span className="font-medium tracking-tight">{label}</span> : null}
    </div>
  );
}

interface InlineLoaderProps {
  readonly label?: ReactNode;
  readonly className?: string;
  readonly size?: number;
}

export function InlineLoader({ label, className, size = 16 }: InlineLoaderProps) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-xs text-muted-foreground", className)}>
      <Loader2
        className="animate-spin text-primary"
        aria-hidden
        style={{ width: size, height: size }}
      />
      {label ? <span>{label}</span> : null}
    </span>
  );
}
