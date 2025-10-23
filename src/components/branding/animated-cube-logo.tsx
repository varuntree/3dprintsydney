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
        "inline-flex items-center justify-center text-primary",
        className,
      )}
    >
      <Box
        aria-hidden
        className={cn(
          "h-6 w-6 drop-shadow-sm will-change-transform animate-cube-tilt",
          iconClassName,
        )}
      />
    </span>
  );
}
