"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type Message = {
  id: number;
  userId: number;
  invoiceId: number | null;
  sender: "ADMIN" | "CLIENT";
  content: string;
  createdAt: string;
};

export type ThreadResponse = {
  messages: Message[];
  nextCursor: { createdAt: string; id: number } | null;
};

function buildCursorParams(cursor: { createdAt: string; id: number } | null, after?: string | null) {
  const params = new URLSearchParams();
  if (cursor) {
    params.set("cursorAt", cursor.createdAt);
    params.set("cursorId", String(cursor.id));
  }
  if (after) {
    params.set("after", after);
  }
  return params.toString();
}

export function useThreadV2(options: {
  userId?: number | string | null;
  invoiceId?: number | null;
  role: "ADMIN" | "CLIENT";
}) {
  const { userId, invoiceId, role } = options;
  const [messages, setMessages] = useState<Message[]>([]);
  const [nextCursor, setNextCursor] = useState<ThreadResponse["nextCursor"]>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revalidating, setRevalidating] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const threadEndpoint = useMemo(() => {
    if (role === "ADMIN") {
      return userId ? `/api/v2/admin/messages/${userId}` : null;
    }
    return "/api/v2/messages";
  }, [role, userId]);

  const load = useCallback(
    async (cursor: ThreadResponse["nextCursor"] = null, replace = false, after: string | null = null) => {
      if (!threadEndpoint) return;
      const qs = new URLSearchParams();
      if (invoiceId) qs.set("invoiceId", String(invoiceId));
      const cursorParams = buildCursorParams(cursor, after);
      const url = cursorParams
        ? `${threadEndpoint}?${cursorParams}&${qs.toString()}`
        : qs.toString()
          ? `${threadEndpoint}?${qs.toString()}`
          : threadEndpoint;

      setError(null);
      // Only set loading if we are replacing the list (initial load)
      if (replace && !after) setLoading(true);
      if (cursor) setRevalidating(true);

      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) {
          // Don't set error on background poll to avoid flashing error state
          if (replace && !after) setError("Failed to load messages");
          return;
        }
        const payload = (await res.json()) as { data: ThreadResponse };
        const data = payload.data;

        // Normalize to oldest-first for natural scroll (top = oldest, bottom = newest)
        const normalized = data.messages.slice().sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        if (!after) {
          setNextCursor(data.nextCursor);
        }

        setMessages((prev) => {
          if (replace && !after) return normalized;

          // If polling (after), append new messages
          // If loading more (cursor), prepend old messages (handled by merge logic below)

          const merged = [...prev, ...normalized].reduce<Message[]>((acc, msg) => {
            if (!acc.find((m) => m.id === msg.id)) acc.push(msg);
            return acc;
          }, []);
          merged.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          return merged;
        });
      } catch (err) {
        console.error(err);
        if (replace && !after) setError("Failed to load messages");
      } finally {
        setLoading(false);
        setRevalidating(false);
      }
    },
    [threadEndpoint, invoiceId],
  );

  const loadInitial = useCallback(() => load(null, true), [load]);
  const loadMore = useCallback(() => {
    if (!nextCursor) return;
    return load(nextCursor, false);
  }, [load, nextCursor]);

  const latest = messages[messages.length - 1]?.createdAt ?? null;

  useEffect(() => {
    setMessages([]);
    setNextCursor(null);
    if (!threadEndpoint) return;
    loadInitial();
  }, [threadEndpoint, loadInitial]);

  // background revalidate every 5s
  useEffect(() => {
    if (!threadEndpoint) return;
    intervalRef.current && clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      // Poll for new messages
      const lastMsg = messages[messages.length - 1];
      const after = lastMsg ? lastMsg.createdAt : null;
      void load(null, false, after);
    }, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [threadEndpoint, load, messages]);

  const addMessage = useCallback((msg: Message) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  return {
    messages,
    nextCursor,
    loading,
    error,
    revalidating,
    loadMore,
    latest,
    addMessage,
  };
}
