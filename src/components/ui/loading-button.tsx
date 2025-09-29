"use client";

import { Loader2 } from "lucide-react";
import { forwardRef, type ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BaseButtonProps = ComponentProps<typeof Button>;

export interface LoadingButtonProps extends BaseButtonProps {
  loading?: boolean;
  loadingText?: string;
  spinnerPosition?: "start" | "end";
}

export const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
  (
    { children, loading = false, loadingText, spinnerPosition = "start", disabled, className, ...props },
    ref,
  ) => {
    const showSpinner = loading;
    const content = loading && loadingText ? loadingText : children;

    return (
      <Button
        ref={ref}
        className={cn("relative gap-2", className)}
        disabled={disabled || loading}
        aria-busy={loading}
        data-loading={loading ? "true" : undefined}
        {...props}
      >
        {showSpinner && spinnerPosition === "start" ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : null}
        <span className={loading ? "opacity-80" : undefined}>{content}</span>
        {showSpinner && spinnerPosition === "end" ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : null}
      </Button>
    );
  },
);

LoadingButton.displayName = "LoadingButton";
