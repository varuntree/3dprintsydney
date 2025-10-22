import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Input component - Mobile optimized
 * - Touch target: h-11 on mobile (44px), h-9 on sm+ (36px)
 * - Text sizing: text-base for better readability
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-11 w-full min-w-0 rounded-lg border border-border bg-card px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:opacity-60 sm:h-9 sm:py-1 md:text-sm",
        "focus-visible:border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500/20",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
