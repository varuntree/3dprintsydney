"use client";

import { forwardRef, useState, type ReactNode, type ComponentProps } from "react";
import { useRouter } from "nextjs-toploader/app";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ActionButtonProps extends ComponentProps<typeof Button> {
  href?: string;
  loading?: boolean;
  loadingText?: ReactNode;
  children: ReactNode;
}

/**
 * ActionButton - Enhanced button with navigation and auto-async handling
 *
 * Features:
 * - Automatic loading state for async onClick handlers
 * - Navigation support via href prop
 * - Manual loading control via loading prop
 * - Loading text customization
 *
 * @example
 * ```tsx
 * // Navigation
 * <ActionButton href="/quotes/new">New Quote</ActionButton>
 *
 * // Async action with auto-loading
 * <ActionButton onClick={async () => { await saveData(); }}>
 *   Save
 * </ActionButton>
 *
 * // Manual loading control
 * <ActionButton loading={isLoading}>Submit</ActionButton>
 * ```
 */
export const ActionButton = forwardRef<HTMLButtonElement, ActionButtonProps>(
  ({ href, loading, loadingText, children, onClick, className, disabled, ...props }, ref) => {
    const router = useRouter();
    const [internalLoading, setInternalLoading] = useState(false);

    const isLoading = loading || internalLoading;

    const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
      // Handle async onClick
      if (onClick) {
        const result = onClick(e);

        // If onClick returns a Promise, track its loading state
        if (result !== undefined && result !== null && typeof result === 'object' && 'then' in result) {
          setInternalLoading(true);
          try {
            await result;
          } finally {
            setInternalLoading(false);
          }
        }
      }

      // Handle navigation
      if (href && !e.defaultPrevented) {
        e.preventDefault();
        router.push(href);
      }
    };

    return (
      <Button
        ref={ref}
        onClick={handleClick}
        disabled={disabled || isLoading}
        className={cn("relative", className)}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {loadingText || children}
          </>
        ) : (
          children
        )}
      </Button>
    );
  }
);

ActionButton.displayName = "ActionButton";