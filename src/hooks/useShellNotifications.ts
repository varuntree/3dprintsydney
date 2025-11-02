"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LegacyUser } from "@/lib/types/user";
import type { NotificationItem } from "@/lib/notifications/types";

const MAX_NOTIFICATIONS = 15;
const POLL_INTERVAL_MS = 15_000;

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
};

type NotificationsResponse = {
  items: ApiNotification[];
  lastSeenAt: string | null;
};

type NotificationsPayload = { data: NotificationsResponse };

type SeenUpdatePayload = { data: { lastSeenAt: string | null } };

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
  const isMessagesRoute = options?.isMessagesRoute ?? false;
  const fetchInFlightRef = useRef(false);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const mapNotifications = useCallback(
    (payload: NotificationsResponse): NotificationItem[] => {
      const seenTime = payload.lastSeenAt
        ? Date.parse(payload.lastSeenAt)
        : null;
      const baseHref =
        options?.messagesHref ??
        (userRole === "ADMIN" ? "/messages" : "/client/messages");

      return payload.items.map((entry) => {
        const createdAt = entry.createdAt ?? new Date().toISOString();
        const createdTime = Date.parse(createdAt);
        const unseen = seenTime
          ? Number.isNaN(createdTime) || createdTime > seenTime
          : true;

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
    [options?.messagesHref, userRole],
  );

  const fetchNotifications = useCallback(
    async ({
      background = false,
      force = false,
    }: { background?: boolean; force?: boolean } = {}) => {
      if (!userId) return;
      if (fetchInFlightRef.current && !force) {
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
        const newestTimestamp =
          mapped.length > 0 ? mapped[0].createdAt : payload.data.lastSeenAt;

        setState({
          items: mapped,
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
    [mapNotifications, userId],
  );

  useEffect(() => {
    if (!userId) {
      setState(DEFAULT_STATE);
      return;
    }

    void fetchNotifications();
  }, [fetchNotifications, userId]);

  useEffect(() => {
    if (!userId || typeof window === "undefined") return;
    const handler = () => {
      void fetchNotifications({ force: true, background: true });
    };

    window.addEventListener("notifications:invalidate", handler);
    return () => {
      window.removeEventListener("notifications:invalidate", handler);
    };
  }, [fetchNotifications, userId]);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    const schedule = () => {
      if (cancelled) return;
      pollingTimeoutRef.current = setTimeout(
        async () => {
          await fetchNotifications({ background: true });
          schedule();
        },
        isMessagesRoute ? POLL_INTERVAL_MS * 2 : POLL_INTERVAL_MS,
      );
    };

    schedule();

    return () => {
      cancelled = true;
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
      }
    };
  }, [fetchNotifications, userId]);

  const unseenCount = useMemo(
    () => items.filter((item) => item.unseen).length,
    [items],
  );

  const markAllSeen = useCallback(async () => {
    if (!userId) return;

    const targetTimestamp = newestMessageTimestamp ?? new Date().toISOString();

    try {
      const response = await fetch(`/api/notifications`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lastSeenAt: targetTimestamp }),
        credentials: "include",
      });
      const payload = (await response.json().catch(() => null)) as unknown;

      if (!response.ok || !isSeenUpdatePayload(payload)) {
        throw new Error(
          extractErrorMessage(payload, "Failed to mark notifications"),
        );
      }

      const nextSeen = payload.data.lastSeenAt;

      setState((prev) => ({
        ...prev,
        lastSeenAt: nextSeen,
        newestMessageTimestamp: nextSeen,
        items: prev.items.map((item) => ({ ...item, unseen: false })),
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error:
          err instanceof Error
            ? err.message
            : "Unexpected error updating notifications",
      }));
    }
  }, [newestMessageTimestamp, userId]);

  useEffect(() => {
    if (!isMessagesRoute || unseenCount === 0) {
      return;
    }
    void markAllSeen();
  }, [isMessagesRoute, unseenCount, markAllSeen]);

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
