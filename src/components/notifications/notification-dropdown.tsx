"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Bell, Loader2, AlertCircle, RefreshCcw } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { LegacyUser } from "@/lib/types/user";
import { useShellNotifications } from "@/hooks/useShellNotifications";

interface NotificationDropdownProps {
  user: LegacyUser;
  openConversationUserId?: number | null;
}

export function NotificationDropdown({ user, openConversationUserId }: NotificationDropdownProps) {
  const [open, setOpen] = useState(false);
  const messagesHref = user.role === "ADMIN" ? "/messages" : "/client/messages";
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMessagesRoute = pathname ? pathname.startsWith(messagesHref) : false;

  const activeConversationId = useMemo(() => {
    if (
      typeof openConversationUserId === "number" &&
      Number.isFinite(openConversationUserId)
    ) {
      return openConversationUserId;
    }
    if (!isMessagesRoute) {
      return null;
    }
    const param = searchParams?.get("user");
    if (!param) return null;
    const parsed = Number(param);
    return Number.isFinite(parsed) ? parsed : null;
  }, [openConversationUserId, searchParams, isMessagesRoute]);

  const { notifications, unseenCount, loading, error, markAllSeen, refetch } =
    useShellNotifications(user, {
      messagesHref,
      isMessagesRoute,
      openConversationUserId: activeConversationId,
    });

  const bellBadge = useMemo(() => {
    if (unseenCount > 9) return "9+";
    if (unseenCount > 0) return String(unseenCount);
    return null;
  }, [unseenCount]);

  const formatTimestamp = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    return (iso: string) => {
      const date = new Date(iso);
      if (Number.isNaN(date.getTime())) {
        return "";
      }
      return formatter.format(date);
    };
  }, []);

  const hasNotifications = notifications.length > 0;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          void refetch();
        }
        // Removed auto-mark on close - users must explicitly click "Mark all read"
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background/70 text-muted-foreground transition-colors hover:border-border hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          )}
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {bellBadge ? (
            <span className="absolute -right-1 -top-1 inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full border border-background bg-destructive px-1 text-[11px] font-semibold leading-none text-destructive-foreground">
              {bellBadge}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={12}
        className="z-50 w-[360px] rounded-3xl border border-border/70 bg-surface-overlay/95 p-0 shadow-xl shadow-black/10 backdrop-blur"
      >
        <div className="flex flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-border/70 px-5 py-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Notifications</p>
              <p className="text-xs text-muted-foreground">
                Stay on top of new client conversations.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full border border-transparent text-muted-foreground transition hover:border-border/70 hover:text-foreground"
                onClick={() => void refetch()}
                aria-label="Refresh notifications"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="h-4 w-4" />
                )}
              </Button>
              {hasNotifications ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-full px-3 text-xs font-medium"
                  onClick={() => void markAllSeen()}
                >
                  Mark all read
                </Button>
              ) : null}
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 px-5 py-6">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="flex animate-pulse gap-3 rounded-2xl border border-border/60 bg-surface-muted/70 px-4 py-3"
                >
                  <div className="h-10 w-10 rounded-full bg-border/80" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 rounded-full bg-border/90" />
                    <div className="h-3 w-3/5 rounded-full bg-border/70" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 px-6 py-10 text-center">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-destructive">
                  Failed to load notifications
                </p>
                <p className="text-xs text-muted-foreground">{error}</p>
              </div>
              <Button size="sm" onClick={() => void refetch()}>
                Try again
              </Button>
            </div>
          ) : !hasNotifications ? (
            <div className="flex min-h-[160px] flex-col items-center justify-center gap-3 px-6 py-12 text-center text-sm text-muted-foreground">
              <Bell className="h-6 w-6" />
              You&apos;re all caught up.
            </div>
          ) : (
            <div className="max-h-[22rem] overflow-y-auto px-3 py-3">
              <ul className="space-y-2">
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <Link
                      href={notification.href ?? messagesHref}
                      className="block rounded-2xl border border-border/60 bg-background/95 px-4 py-3 transition hover:border-border hover:bg-background"
                    >
                      <div className="flex gap-3">
                        <div className="relative mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/60 bg-surface-muted text-xs font-semibold uppercase text-muted-foreground">
                          {notification.senderRole === "ADMIN"
                            ? "AD"
                            : (
                                notification.userName ??
                                notification.userEmail ??
                                "CL"
                              )
                                .slice(0, 2)
                                .toUpperCase()}
                          <span className="absolute -right-1 -top-1 inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {notification.title}
                            </p>
                            <span className="shrink-0 text-[11px] uppercase tracking-wide text-muted-foreground">
                              {formatTimestamp(notification.createdAt)}
                            </span>
                          </div>
                          {notification.description ? (
                            <p className="line-clamp-2 text-sm text-muted-foreground">
                              {notification.description}
                            </p>
                          ) : null}
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground/80">
                            {notification.userName || notification.userEmail ? (
                              <span className="uppercase tracking-[0.22em]">
                                {notification.userName ?? notification.userEmail}
                              </span>
                            ) : null}
                            {notification.invoiceId ? (
                              <Badge variant="outline" className="rounded-full border-border/60 bg-surface-overlay px-2 py-0.5 text-[10px] uppercase tracking-[0.25em]">
                                Invoice #{notification.invoiceId}
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="border-t border-border/70 px-5 py-3">
            <Button asChild className="w-full rounded-full">
              <Link href={messagesHref}>Open Messages</Link>
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
