"use client";

import { cn } from "@/lib/utils";
import { useRouteLoadingIndicator } from "@/hooks/useRouteLoadingIndicator";

interface RouteProgressBarProps {
  readonly className?: string;
}

export function RouteProgressBar({ className }: RouteProgressBarProps) {
  const { visible, progress } = useRouteLoadingIndicator();

  return (
    <div
      role="progressbar"
      aria-hidden={!visible}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress)}
      aria-live="polite"
      aria-label="Page loading"
      className={cn(
        "pointer-events-none relative h-0.5 w-full overflow-hidden",
        !visible && "opacity-0",
        visible && "opacity-100",
        "transition-opacity duration-150",
        className,
      )}
    >
      <div
        className="absolute inset-y-0 left-0 origin-left rounded-full bg-accent-strong"
        style={{
          transform: `scaleX(${Math.max(0.05, progress / 100)})`,
          transition: visible ? "transform 120ms ease-out" : "transform 220ms ease-in",
        }}
      />
    </div>
  );
}
