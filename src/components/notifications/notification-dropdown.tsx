"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bell, Loader2, AlertCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { LegacyUser } from "@/lib/types/user";
import { useShellNotifications } from "@/hooks/useShellNotifications";

interface NotificationDropdownProps {
  user: LegacyUser;
}

export function NotificationDropdown({ user }: NotificationDropdownProps) {
  const [open, setOpen] = useState(false);
  const messagesHref = user.role === "ADMIN" ? "/admin/messages" : "/client/messages";
  const { notifications, unseenCount, loading, error, markAllSeen, refetch } = useShellNotifications(
    user,
    { messagesHref },
  );

  const bellBadge = useMemo(() => {
    if (unseenCount > 9) return "9+";
    if (unseenCount > 0) return String(unseenCount);
    return null;
  }, [unseenCount]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          markAllSeen();
        }
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
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Notifications</p>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => void refetch()}
            disabled={loading}
          >
            {loading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
            Refresh
          </Button>
        </div>
        <div className="max-h-80">
          {loading ? (
            <div className="flex min-h-[160px] items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : error ? (
            <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 px-6 py-10 text-center text-sm">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="font-medium text-destructive">Failed to load notifications</p>
              <p className="text-muted-foreground">{error}</p>
              <Button size="sm" onClick={() => void refetch()}>
                Try again
              </Button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 px-6 py-10 text-center text-sm text-muted-foreground">
              <Bell className="h-5 w-5" />
              No notifications yet
            </div>
          ) : (
            <ScrollArea className="max-h-80">
              <ul className="divide-y divide-border/60">
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <Link
                      href={notification.href ?? messagesHref}
                      className="flex gap-3 px-4 py-3 hover:bg-surface-subtle/80"
                    >
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold uppercase text-muted-foreground">
                        {notification.senderRole === "ADMIN" ? "AD" : "CL"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium text-foreground">
                            {notification.title}
                          </p>
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(notification.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {notification.description ? (
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                            {notification.description}
                          </p>
                        ) : null}
                        {notification.invoiceId ? (
                          <Badge variant="outline" className="mt-2 w-fit">
                            Invoice #{notification.invoiceId}
                          </Badge>
                        ) : null}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </div>
        <div className="border-t border-border/70 px-4 py-2">
          <Link
            href={messagesHref}
            className="block text-center text-sm font-medium text-primary hover:underline"
          >
            View all messages
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

