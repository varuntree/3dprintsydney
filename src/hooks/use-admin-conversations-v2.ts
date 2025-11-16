"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ConversationSummary = {
  userId: number;
  email: string;
  lastMessage: {
    id: number;
    sender: "ADMIN" | "CLIENT";
    content: string;
    createdAt: string;
  } | null;
  totalMessages: number;
  hasUnread: boolean;
};

export function useAdminConversationsV2(search: string) {
  const [items, setItems] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const qs = new URLSearchParams();
    if (search.trim()) qs.set("search", search.trim());
    const res = await fetch(`/api/v2/admin/conversations${qs.toString() ? `?${qs.toString()}` : ""}`, { signal: ctrl.signal });
    if (!res.ok) {
      setError("Failed to load conversations");
      setLoading(false);
      return;
    }
    const payload = (await res.json()) as { data: { conversations: ConversationSummary[] } };
    setItems(payload.data.conversations);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    void load();
    return () => abortRef.current?.abort();
  }, [load]);

  return { items, loading, error, reload: load };
}
