"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LegacyUser } from "@/lib/types/user";
import type { NotificationItem } from "@/lib/notifications/types";

const MAX_NOTIFICATIONS = 15;
// Reduced from 5s to 30s to cut database queries from 720/hr to 120/hr (83% reduction)
// Free plan budget constraint - notifications not time-critical
const POLL_INTERVAL_MS = 30_000;

interface NotificationState {
  items: NotificationItem[];
  loading: boolean;
  error: string | null;
  lastSeenAt: string | null;
  newestMessageTimestamp: string | null;
}

const DEFAULT_STATE: NotificationState = {
  items: [],
  loading: true,
  error: null,
  lastSeenAt: null,
  newestMessageTimestamp: null,
};

interface UseShellNotificationsOptions {
  messagesHref?: string;
  isMessagesRoute?: boolean;
  openConversationUserId?: number | null; // Currently open conversation to exclude from notifications
}

type ApiNotification = {
  id: number;
  userId: number;
  invoiceId: number | null;
  sender: "ADMIN" | "CLIENT";
  content: string;
  createdAt: string;
  userEmail?: string | null;
  userName?: string | null;
  conversationLastSeenAt?: string | null;
};

type NotificationsResponse = {
  items: ApiNotification[];
  lastSeenAt: string | null;
};

type NotificationsPayload = { data: NotificationsResponse };

type SeenUpdatePayload = {
  data: { lastSeenAt: string | null; conversationUserId?: number | null };
};

function isNotificationsPayload(
  payload: unknown,
): payload is NotificationsPayload {
  if (typeof payload !== "object" || payload === null) return false;
  const data = (payload as { data?: unknown }).data;
  if (typeof data !== "object" || data === null) return false;
  const items = (data as { items?: unknown }).items;
  if (!Array.isArray(items)) return false;
  return true;
}

function isSeenUpdatePayload(payload: unknown): payload is SeenUpdatePayload {
  if (typeof payload !== "object" || payload === null) return false;
  const data = (payload as { data?: unknown }).data;
  if (typeof data !== "object" || data === null) return false;
  return "lastSeenAt" in data;
}

function formatHref(
  baseHref: string | undefined,
  userId: number | null,
): string {
  const fallback = baseHref ?? "/messages";
  if (!userId) return fallback;
  const separator = fallback.includes("?") ? "&" : "?";
  return `${fallback}${separator}user=${userId}`;
}

export function useShellNotifications(
  user: LegacyUser | null | undefined,
  options?: UseShellNotificationsOptions,
) {
  const [{ items, loading, error, newestMessageTimestamp }, setState] =
    useState<NotificationState>(DEFAULT_STATE);

  const userId = user?.id ?? null;
  const userRole = user?.role ?? null;
  
  // Extract options to stable primitives to prevent infinite re-renders
  const messagesHref = options?.messagesHref;
  const isMessagesRoute = options?.isMessagesRoute ?? false;
  const openConversationUserId = options?.openConversationUserId ?? null;
  
  const fetchInFlightRef = useRef(false);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingActiveRef = useRef(false); // Guard against double polling
  const markingSeenRef = useRef(false); // Prevent polling during mark-as-read

  const mapNotifications = useCallback(
    (payload: NotificationsResponse): NotificationItem[] => {
      const globalSeenTime = payload.lastSeenAt
        ? Date.parse(payload.lastSeenAt)
        : null;
      const baseHref =
        messagesHref ??
        (userRole === "ADMIN" ? "/messages" : "/client/messages");

      return payload.items.map((entry) => {
        const createdAt = entry.createdAt ?? new Date().toISOString();
        const createdTime = Date.parse(createdAt);
        const conversationSeenRaw = entry.conversationLastSeenAt ?? null;
        const conversationSeenTime = conversationSeenRaw
          ? Date.parse(conversationSeenRaw)
          : null;
        let baseline = conversationSeenTime;
        if (baseline === null || Number.isNaN(baseline)) {
          baseline = globalSeenTime;
        }

        const comparison = Number.isNaN(createdTime)
          ? null
          : baseline !== null && !Number.isNaN(baseline)
            ? baseline
            : null;

        let unseen = comparison
          ? createdTime > comparison
          : !Number.isNaN(createdTime);

        const senderRole = entry.sender;
        const isClientMessage = senderRole === "CLIENT";
        const displayName = entry.userName?.trim()
          ? entry.userName
          : entry.userEmail?.trim()
            ? entry.userEmail
            : isClientMessage
              ? `Client #${entry.userId}`
              : "3D Print Sydney";

        const title = isClientMessage
          ? `New message from ${displayName}`
          : `New message from ${displayName}`;

        const href =
          userRole === "ADMIN" ? formatHref(baseHref, entry.userId) : baseHref;

        if (
          openConversationUserId &&
          Number.isFinite(openConversationUserId) &&
          entry.userId === openConversationUserId
        ) {
          unseen = false;
        }

        return {
          id: String(entry.id ?? createdAt),
          kind: "message" as const,
          senderRole,
          title,
          description: entry.content ?? "",
          createdAt,
          href,
          invoiceId: entry.invoiceId ?? null,
          userId: entry.userId,
          userEmail: entry.userEmail ?? null,
          userName: entry.userName ?? null,
          unseen,
        };
      });
    },
    [messagesHref, openConversationUserId, userRole],
  );

  const fetchNotifications = useCallback(
    async ({
      background = false,
      force = false,
    }: { background?: boolean; force?: boolean } = {}) => {
      if (!userId) return;

      // When on messages route, return empty notifications immediately (no fetch needed)
      if (isMessagesRoute && !force) {
        setState({
          items: [],
          loading: false,
          error: null,
          lastSeenAt: null,
          newestMessageTimestamp: null,
        });
        return;
      }

      if (fetchInFlightRef.current && !force) {
        return;
      }
      // Prevent polling during mark-as-read to avoid race condition
      if (markingSeenRef.current && !force) {
        return;
      }

      fetchInFlightRef.current = true;
      if (!background) {
        setState((prev) => ({ ...prev, loading: true, error: null }));
      }

      try {
        const params = new URLSearchParams({
          limit: String(MAX_NOTIFICATIONS),
        });
        
        // Exclude messages from currently open conversation
        if (openConversationUserId && Number.isFinite(openConversationUserId)) {
          params.set("excludeUserId", String(openConversationUserId));
        }
        
        const response = await fetch(
          `/api/notifications?${params.toString()}`,
          {
            credentials: "include",
          },
        );
        const payload = (await response.json().catch(() => null)) as unknown;

        if (!response.ok || !isNotificationsPayload(payload)) {
          throw new Error(
            extractErrorMessage(payload, "Failed to load notifications"),
          );
        }

        const mapped = mapNotifications(payload.data);
        const visible = mapped.filter((item) => item.unseen);
        const newestTimestamp =
          visible.length > 0
            ? visible[0].createdAt
            : payload.data.lastSeenAt;

        setState({
          items: visible,
          loading: false,
          error: null,
          lastSeenAt: payload.data.lastSeenAt,
          newestMessageTimestamp: newestTimestamp ?? null,
        });
      } catch (err) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error:
            err instanceof Error
              ? err.message
              : "Unexpected error loading notifications",
        }));
      } finally {
        fetchInFlightRef.current = false;
      }
    },
    [isMessagesRoute, mapNotifications, openConversationUserId, userId],
  );

  useEffect(() => {
    if (!userId) {
      setState(DEFAULT_STATE);
      return;
    }

    void fetchNotifications();
  }, [fetchNotifications, userId]);

  // Combined event listeners with debouncing for better performance
  useEffect(() => {
    if (!userId || typeof window === "undefined") return;

    let debounceTimeout: NodeJS.Timeout;

    // Debounced handler prevents multiple rapid calls (e.g., 3 events in 300ms → 1 fetch)
    // Increased from 150ms to 300ms to further reduce duplicate fetches
    const debouncedFetch = () => {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
        void fetchNotifications({ force: true, background: true });
      }, 300);
    };

    // Single handler for all notification-triggering events
    const handleNotificationInvalidate = () => debouncedFetch();
    const handleMessagesUpdate = () => debouncedFetch();
    const handleVisibility = () => {
      if (!document.hidden) {
        debouncedFetch();
      }
    };

    window.addEventListener("notifications:invalidate", handleNotificationInvalidate);
    window.addEventListener("messages:updated", handleMessagesUpdate);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearTimeout(debounceTimeout);
      window.removeEventListener("notifications:invalidate", handleNotificationInvalidate);
      window.removeEventListener("messages:updated", handleMessagesUpdate);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchNotifications, userId]);

  // Refresh when open conversation changes
  useEffect(() => {
    if (userId) {
      void fetchNotifications({ force: true, background: true });
    }
  }, [openConversationUserId, fetchNotifications, userId]);

  // Polling loop with guard to prevent double activation
  // Disabled entirely when on messages route to reduce cost further
  useEffect(() => {
    if (!userId || pollingActiveRef.current || isMessagesRoute) return;

    pollingActiveRef.current = true;
    let cancelled = false;

    const schedule = () => {
      if (cancelled) return;
      pollingTimeoutRef.current = setTimeout(
        async () => {
          if (cancelled) return; // Check again before fetching
          await fetchNotifications({ background: true });
          if (!cancelled) { // Check again before rescheduling
            schedule();
          }
        },
        POLL_INTERVAL_MS,
      );
    };

    schedule();

    return () => {
      cancelled = true;
      pollingActiveRef.current = false;
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
      }
    };
  }, [fetchNotifications, isMessagesRoute, userId]);

  const unseenCount = useMemo(() => items.length, [items]);

  const markAllSeen = useCallback(async () => {
    if (!userId) return;

    const targetTimestamp = newestMessageTimestamp ?? new Date().toISOString();
    const conversationUserId = openConversationUserId;

    try {
      // Set flag to prevent concurrent polling during mark-as-read
      markingSeenRef.current = true;

      const response = await fetch(`/api/notifications`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lastSeenAt: targetTimestamp,
          conversationUserId: conversationUserId ?? undefined,
        }),
        credentials: "include",
      });
      const payload = (await response.json().catch(() => null)) as unknown;

      if (!response.ok || !isSeenUpdatePayload(payload)) {
        throw new Error(
          extractErrorMessage(payload, "Failed to mark notifications"),
        );
      }

      const nextSeen = payload.data.lastSeenAt;
      const rawConversationId = (payload.data as {
        conversationUserId?: unknown;
      }).conversationUserId;
      const parsedConversationId =
        typeof rawConversationId === "number"
          ? rawConversationId
          : typeof rawConversationId === "string"
            ? Number(rawConversationId)
            : null;
      const markedConversationId =
        parsedConversationId !== null && Number.isFinite(parsedConversationId)
          ? parsedConversationId
          : null;

      setState((prev) => ({
        ...prev,
        lastSeenAt: nextSeen,
        newestMessageTimestamp: nextSeen,
        items: markedConversationId
          ? prev.items.filter((item) => item.userId !== markedConversationId)
          : [],
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error:
          err instanceof Error
            ? err.message
            : "Unexpected error updating notifications",
      }));
    } finally {
      // Clear flag to allow polling to resume
      markingSeenRef.current = false;
    }
  }, [newestMessageTimestamp, openConversationUserId, userId]);

  useEffect(() => {
    if (!isMessagesRoute || unseenCount === 0) {
      return;
    }
    if (
      !openConversationUserId ||
      !Number.isFinite(openConversationUserId)
    ) {
      return;
    }
    void markAllSeen();
  }, [isMessagesRoute, unseenCount, openConversationUserId, markAllSeen]);

  const refetch = useCallback(
    () => fetchNotifications({ force: true }),
    [fetchNotifications],
  );

  return {
    notifications: items,
    loading,
    error,
    unseenCount,
    markAllSeen,
    refetch,
  };
}

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === "object" && payload !== null) {
    const possibleError = (payload as { error?: { message?: unknown } }).error;
    if (
      possibleError &&
      typeof possibleError === "object" &&
      possibleError !== null
    ) {
      const { message } = possibleError as { message?: unknown };
      if (typeof message === "string" && message.trim().length > 0) {
        return message;
      }
    }
  }
  return fallback;
}
