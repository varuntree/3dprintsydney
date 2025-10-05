"use client";

import Link from "next/link";
import { type ReactNode, useCallback } from "react";
import { useNavigation } from "@/hooks/useNavigation";
import { cn } from "@/lib/utils";
import { InlineLoader } from "@/components/ui/loader";

interface NavigationLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  active?: boolean;
  onClick?: () => void;
  prefetch?: boolean;
  replace?: boolean;
  scroll?: boolean;
  title?: string;
  fullWidth?: boolean;
  "aria-label"?: string;
  asChild?: boolean;
}

export function NavigationLink({
  href,
  children,
  className,
  active,
  onClick,
  prefetch,
  replace,
  scroll,
  title,
  fullWidth = true,
  "aria-label": ariaLabel,
  asChild = false,
}: NavigationLinkProps) {
  const { isNavigating, navigatingTo, navigate } = useNavigation();
  const isLoadingThisLink = isNavigating && navigatingTo === href;

  const handleClick = useCallback(
    async (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      event.preventDefault();
      onClick?.();
      await navigate(href, { replace });
    },
    [href, navigate, onClick, replace],
  );

  // If used as child component (e.g., inside a Button), skip the default styles
  const linkClassName = asChild
    ? className
    : cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-all",
        fullWidth ? "w-full" : "w-auto",
        active
          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
          : "text-sidebar-foreground opacity-70 hover:opacity-100 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        isNavigating && "cursor-progress",
        className,
      );

  return (
    <Link
      href={href}
      prefetch={prefetch}
      replace={replace}
      scroll={scroll}
      onClick={handleClick}
      aria-busy={isLoadingThisLink}
      aria-current={active ? "page" : undefined}
      aria-disabled={isNavigating || undefined}
      aria-label={ariaLabel}
      title={title}
      className={linkClassName}
    >
      {isLoadingThisLink ? (
        <InlineLoader />
      ) : (
        children
      )}
    </Link>
  );
}
