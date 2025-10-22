"use client";

import { Box } from "lucide-react";

import { cn } from "@/lib/utils";

type AnimatedCubeLogoProps = React.ComponentPropsWithoutRef<"span"> & {
  iconClassName?: string;
};

export function AnimatedCubeLogo({
  className,
  iconClassName,
  "aria-hidden": ariaHidden,
  ...rest
}: AnimatedCubeLogoProps) {
  return (
    <span
      aria-hidden={ariaHidden ?? true}
      {...rest}
      className={cn(
        "relative inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-white/80 shadow-sm shadow-black/10 backdrop-blur",
        className,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-6 z-[1] animate-cube-orbit rounded-full bg-[conic-gradient(at_50%_50%,rgba(14,95,255,0.85)_0deg,rgba(205,255,0,0.45)_140deg,rgba(14,95,255,0.85)_360deg)] opacity-80 blur-md mix-blend-screen will-change-transform"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 rounded-[inherit] border border-white/60 bg-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
      />
      <Box
        aria-hidden
        className={cn(
          "relative z-[2] h-4 w-4 text-foreground/80 drop-shadow-sm will-change-transform animate-cube-tilt",
          iconClassName,
        )}
      />
    </span>
  );
}
