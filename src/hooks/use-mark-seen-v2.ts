"use client";

import { useEffect } from "react";

export function useMarkSeenV2(options: { enabled: boolean; lastSeenAt: string | null; conversationUserId?: number | null; }) {
  const { enabled, lastSeenAt, conversationUserId } = options;

  useEffect(() => {
    if (!enabled || !lastSeenAt) return;
    const controller = new AbortController();
    void fetch("/api/v2/messages/seen", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lastSeenAt, conversationUserId: conversationUserId ?? null }),
      signal: controller.signal,
    }).catch(() => {});
    return () => controller.abort();
  }, [enabled, lastSeenAt, conversationUserId]);
}
