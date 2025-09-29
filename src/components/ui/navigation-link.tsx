"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { type ReactNode, useCallback } from "react";
import { useNavigation } from "@/hooks/useNavigation";
import { cn } from "@/lib/utils";

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
      title={title}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-all",
        fullWidth ? "w-full" : "w-auto",
        active
          ? "bg-zinc-900 text-white shadow-md"
          : "text-zinc-500 hover:bg-white/80 hover:text-zinc-900",
        isNavigating && "cursor-progress",
        className,
      )}
    >
      {isLoadingThisLink ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        children
      )}
    </Link>
  );
}
