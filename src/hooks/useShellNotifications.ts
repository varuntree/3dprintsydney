"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { LegacyUser } from "@/lib/types/user";
import type { NotificationItem } from "@/lib/notifications/types";

type NotificationState = {
  items: NotificationItem[];
  loading: boolean;
  error: string | null;
  lastSeenAt: string | null;
  newestMessageTimestamp: string | null;
};

const DEFAULT_STATE: NotificationState = {
  items: [],
  loading: true,
  error: null,
  lastSeenAt: null,
  newestMessageTimestamp: null,
};

const MAX_NOTIFICATIONS = 10;

interface UseShellNotificationsOptions {
  messagesHref?: string;
}

function getStorageKey(userId: number) {
  return `notifications:lastSeen:${userId}`;
}

export function useShellNotifications(
  user: LegacyUser | null | undefined,
  options?: UseShellNotificationsOptions,
) {
  const [{ items, loading, error, lastSeenAt, newestMessageTimestamp }, setState] = useState<NotificationState>(DEFAULT_STATE);

  const userId = user?.id ?? null;

  const loadLastSeen = useCallback(() => {
    if (!userId || typeof window === "undefined") return null;
    return window.localStorage.getItem(getStorageKey(userId));
  }, [userId]);

  const persistLastSeen = useCallback(
    (isoTimestamp: string) => {
      if (!userId || typeof window === "undefined") return;
      window.localStorage.setItem(getStorageKey(userId), isoTimestamp);
    },
    [userId],
  );

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const params = new URLSearchParams({
        limit: String(MAX_NOTIFICATIONS),
        order: "desc",
      });
      const response = await fetch(`/api/messages?${params.toString()}`, {
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          typeof data?.error === "string" ? data.error : "Failed to load notifications",
        );
      }

      const { data } = (await response.json()) as { data: Array<Record<string, unknown>> };

      const mapped: NotificationItem[] = (Array.isArray(data) ? data : []).map((entry) => {
        const id = Number(entry.id ?? 0);
        const sender = (entry.sender === "ADMIN" ? "ADMIN" : "CLIENT") as "ADMIN" | "CLIENT";
        const createdAt = String(entry.createdAt ?? entry.created_at ?? new Date().toISOString());
        const content = String(entry.content ?? "");
        const invoiceIdRaw = entry.invoiceId ?? entry.invoice_id ?? null;
        const invoiceId =
          typeof invoiceIdRaw === "number"
            ? invoiceIdRaw
            : invoiceIdRaw === null
              ? null
              : Number(invoiceIdRaw) || null;

        return {
          id: id ? String(id) : `${createdAt}-${sender}`,
          kind: "message",
          senderRole: sender,
          title: sender === "ADMIN" ? "Incoming message from Admin" : "Incoming client message",
          description: content,
          createdAt,
          href: options?.messagesHref ?? "/messages",
          invoiceId,
        };
      });

      const storedLastSeen = loadLastSeen();

      // Extract newest message timestamp from full list (before filtering)
      const newestTimestamp = mapped.length > 0 ? mapped[0].createdAt : null;

      const filtered = (() => {
        if (!storedLastSeen) return mapped;
        const lastSeenTime = Date.parse(storedLastSeen);
        if (Number.isNaN(lastSeenTime)) return mapped;
        return mapped.filter((item) => {
          const itemTime = Date.parse(item.createdAt);
          if (Number.isNaN(itemTime)) return true;
          return itemTime > lastSeenTime;
        });
      })();

      setState({
        items: filtered,
        loading: false,
        error: null,
        lastSeenAt: storedLastSeen,
        newestMessageTimestamp: newestTimestamp,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Unexpected error loading notifications",
      }));
    }
  }, [loadLastSeen, options?.messagesHref, userId]);

  useEffect(() => {
    if (!userId) {
      setState(DEFAULT_STATE);
      return;
    }

    const storedLastSeen = loadLastSeen();
    setState((prev) => ({
      ...prev,
      lastSeenAt: storedLastSeen,
    }));

    void fetchNotifications();
  }, [fetchNotifications, loadLastSeen, userId]);

  const unseenCount = useMemo(() => {
    if (!items.length) return 0;
    if (!lastSeenAt) return items.length;
    const lastSeenTime = Date.parse(lastSeenAt);
    if (Number.isNaN(lastSeenTime)) return items.length;

    return items.reduce((count, item) => {
      const itemTime = Date.parse(item.createdAt);
      if (!Number.isNaN(itemTime) && itemTime > lastSeenTime) {
        return count + 1;
      }
      return count;
    }, 0);
  }, [items, lastSeenAt]);

  const markAllSeen = useCallback(() => {
    if (!newestMessageTimestamp) return;

    persistLastSeen(newestMessageTimestamp);
    setState((prev) => ({
      ...prev,
      lastSeenAt: newestMessageTimestamp,
    }));
  }, [newestMessageTimestamp, persistLastSeen]);

  const clearNotifications = useCallback(() => {
    setState((prev) => {
      if (!prev.items.length) {
        return prev;
      }

      const lastSeen = prev.lastSeenAt;
      if (!lastSeen) {
        return {
          ...prev,
          items: [],
        };
      }

      const lastSeenTime = Date.parse(lastSeen);
      if (Number.isNaN(lastSeenTime)) {
        return {
          ...prev,
          items: [],
        };
      }

      return {
        ...prev,
        items: prev.items.filter((item) => {
          const itemTime = Date.parse(item.createdAt);
          if (Number.isNaN(itemTime)) return true;
          return itemTime > lastSeenTime;
        }),
      };
    });
  }, []);

  return {
    notifications: items,
    loading,
    error,
    unseenCount,
    markAllSeen,
    refetch: fetchNotifications,
    clearNotifications,
  };
}
