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

function buildCursorParams(cursor: { createdAt: string; id: number } | null) {
  if (!cursor) return "";
  const params = new URLSearchParams();
  params.set("cursorAt", cursor.createdAt);
  params.set("cursorId", String(cursor.id));
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
    async (cursor: ThreadResponse["nextCursor"] = null, replace = false) => {
      if (!threadEndpoint) return;
      const qs = new URLSearchParams();
      if (invoiceId) qs.set("invoiceId", String(invoiceId));
      const cursorParams = buildCursorParams(cursor);
      const url = cursorParams
        ? `${threadEndpoint}?${cursorParams}&${qs.toString()}`
        : qs.toString()
          ? `${threadEndpoint}?${qs.toString()}`
          : threadEndpoint;

      setError(null);
      setLoading(!cursor && replace);
      setRevalidating(Boolean(cursor));

      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        setError("Failed to load messages");
        setLoading(false);
        setRevalidating(false);
        return;
      }
      const payload = (await res.json()) as { data: ThreadResponse };
      const data = payload.data;
      setNextCursor(data.nextCursor);
      setMessages((prev) => {
        if (replace) return data.messages;
        // newest-first
        const merged = [...prev, ...data.messages].reduce<Message[]>((acc, msg) => {
          if (!acc.find((m) => m.id === msg.id)) acc.push(msg);
          return acc;
        }, []);
        merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return merged;
      });
      setLoading(false);
      setRevalidating(false);
    },
    [threadEndpoint, invoiceId],
  );

  const loadInitial = useCallback(() => load(null, true), [load]);
  const loadMore = useCallback(() => {
    if (!nextCursor) return;
    return load(nextCursor, false);
  }, [load, nextCursor]);

  const latest = messages[0]?.createdAt ?? null;

  useEffect(() => {
    setMessages([]);
    setNextCursor(null);
    if (!threadEndpoint) return;
    loadInitial();
  }, [threadEndpoint, loadInitial]);

  // background revalidate every 8s
  useEffect(() => {
    if (!threadEndpoint) return;
    intervalRef.current && clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      void load(null, true);
    }, 8000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [threadEndpoint, load]);

  return {
    messages,
    nextCursor,
    loading,
    error,
    revalidating,
    loadMore,
    latest,
  };
}
