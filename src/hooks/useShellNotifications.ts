"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import type { LegacyUser } from "@/lib/types/user";
import type { NotificationItem } from "@/lib/notifications/types";

const POLL_INTERVAL_MS = 10_000;

interface NotificationState {
  items: NotificationItem[];
  loading: boolean;
  error: string | null;
}

const DEFAULT_STATE: NotificationState = {
  items: [],
  loading: true,
  error: null,
};

export function useShellNotifications(user: LegacyUser | null | undefined) {
  const [{ items, loading, error }, setState] =
    useState<NotificationState>(DEFAULT_STATE);

  const userId = user?.id ?? null;
  const fetchInFlightRef = useRef(false);
  const stateVersionRef = useRef(0);

  const fetchNotifications = useCallback(
    async ({ background = false, after = undefined }: { background?: boolean; after?: string } = {}) => {
      if (!userId) return;
      if (fetchInFlightRef.current) return;

      const currentVersion = stateVersionRef.current;
      fetchInFlightRef.current = true;
      if (!background) {
        setState((prev) => ({ ...prev, loading: true, error: null }));
      }

      try {
        const qs = new URLSearchParams();
        qs.set("limit", "20");
        if (after) qs.set("after", after);

        const response = await fetch(`/api/notifications?${qs.toString()}`, {
          cache: "no-store",
          headers: {
            "Pragma": "no-cache",
            "Cache-Control": "no-cache, no-store, must-revalidate"
          }
        });
        if (!response.ok) throw new Error("Failed to fetch notifications");

        const payload = await response.json();
        const fetchedItems = payload.data?.items ?? [];

        if (stateVersionRef.current !== currentVersion) return;

        setState((prev) => {
          if (after) {
            // Append new items to the beginning (since we order by created_at desc, but UI usually shows newest first)
            // Wait, getNotifications returns newest first.
            // If we fetch 'after' a date, we get newer items.
            // So we should put them at the top.
            const existingIds = new Set(prev.items.map(i => i.id));
            const newItems = fetchedItems.filter((i: NotificationItem) => !existingIds.has(i.id));
            return {
              ...prev,
              items: [...newItems, ...prev.items],
              loading: false,
              error: null
            };
          }
          return {
            items: fetchedItems,
            loading: false,
            error: null,
          };
        });
      } catch (err) {
        console.error(err);
        if (!background) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: "Failed to load notifications",
          }));
        }
      } finally {
        fetchInFlightRef.current = false;
      }
    },
    [userId]
  );

  // Initial fetch and polling
  useEffect(() => {
    if (!userId) {
      setState(DEFAULT_STATE);
      return;
    }

    void fetchNotifications();

    const interval = setInterval(() => {
      // Poll for new notifications
      // We want notifications created AFTER the latest one we have.
      // Our items are sorted newest first (index 0).
      // So we take items[0].createdAt
      setState((prev) => {
        const latest = prev.items[0]?.createdAt;
        void fetchNotifications({ background: true, after: latest });
        return prev;
      });
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [fetchNotifications, userId]);

  const markAllSeen = useCallback(async () => {
    if (!userId) return;

    stateVersionRef.current++;

    // Optimistic update
    setState((prev) => ({
      ...prev,
      items: prev.items.map((item) => ({
        ...item,
        readAt: new Date().toISOString(),
      })),
    }));

    try {
      await fetch("/api/notifications/mark-read", {
        method: "POST",
        body: JSON.stringify({ all: true }),
      });
      // Re-fetch to ensure sync
      void fetchNotifications({ background: true });
    } catch (err) {
      console.error("Failed to mark notifications as read", err);
      // Revert on error would be complex, just refetch
      void fetchNotifications({ background: true });
    }
  }, [userId, fetchNotifications]);

  const markAsRead = useCallback(async (id: number) => {
    if (!userId) return;

    stateVersionRef.current++;

    // Optimistic update
    setState((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, readAt: new Date().toISOString() } : item
      ),
    }));

    try {
      await fetch("/api/notifications/mark-read", {
        method: "POST",
        body: JSON.stringify({ ids: [id] }),
      });
      // Re-fetch to ensure sync
      void fetchNotifications({ background: true });
    } catch (err) {
      console.error("Failed to mark notification as read", err);
      void fetchNotifications({ background: true });
    }
  }, [userId, fetchNotifications]);

  const unreadCount = items.filter((i) => !i.readAt).length;

  return {
    notifications: items,
    loading,
    error,
    unseenCount: unreadCount,
    markAllSeen,
    markAsRead,
    refetch: () => fetchNotifications({ background: false }),
    clearRead: useCallback(async () => {
      stateVersionRef.current++;

      // Optimistic update
      setState((prev) => ({
        ...prev,
        items: prev.items.filter(i => !i.readAt)
      }));

      try {
        await fetch("/api/notifications/clear-read", {
          method: "POST",
        });
        // No need to refetch immediately if optimistic update is correct, 
        // but good practice to ensure sync eventually. 
        // However, since we just hid them, refetching might bring them back if API failed?
        // If API fails, we might want to revert or just let next poll handle it.
        // Let's trigger a background fetch to be safe.
        // We trust the optimistic update. 
        // Don't refetch immediately to avoid race conditions where the DB update isn't visible yet.
        // The next poll will pick up any *new* notifications.
        void fetchNotifications({ background: true });
      } catch (err) {
        console.error("Failed to clear read notifications", err);
        // Revert? Or just refetch.
        void fetchNotifications({ background: true });
      }
    }, [fetchNotifications]),
  };
}
