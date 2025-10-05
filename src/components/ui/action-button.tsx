"use client";

import { forwardRef, type ReactNode, type ComponentProps } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ActionButtonProps extends ComponentProps<typeof Button> {
  href?: string;
  loading?: boolean;
  loadingText?: ReactNode;
  children: ReactNode;
}

export const ActionButton = forwardRef<HTMLButtonElement, ActionButtonProps>(
  ({ href, loading, loadingText, children, onClick, className, disabled, ...props }, ref) => {
    const router = useRouter();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (onClick) {
        onClick(e);
      }
      if (href && !e.defaultPrevented) {
        e.preventDefault();
        router.push(href);
      }
    };

    return (
      <Button
        ref={ref}
        onClick={handleClick}
        disabled={disabled || loading}
        className={cn(
          "relative",
          className
        )}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
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