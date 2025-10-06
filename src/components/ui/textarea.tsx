import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "placeholder:text-muted-foreground aria-invalid:border-destructive aria-invalid:ring-destructive/20 flex field-sizing-content min-h-16 w-full rounded-lg border border-border bg-card px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
