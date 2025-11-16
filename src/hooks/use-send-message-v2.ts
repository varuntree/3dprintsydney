"use client";

import { useState, useCallback } from "react";
import type { Message } from "./use-thread-v2";

export function useSendMessageV2(options: { userId?: number | string | null; role: "ADMIN" | "CLIENT"; invoiceId?: number | null; onSuccess?: (msg: Message) => void; }) {
  const { userId, role, invoiceId, onSuccess } = options;
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(async (content: string) => {
    if (!content.trim()) return;
    setSending(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { content };
      if (invoiceId) body.invoiceId = invoiceId;
      const endpoint = role === "ADMIN" ? `/api/v2/admin/messages/${userId}` : "/api/v2/messages";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setError("Failed to send message");
        return;
      }
      const payload = (await res.json()) as { data: Message };
      onSuccess?.(payload.data);
    } finally {
      setSending(false);
    }
  }, [role, userId, invoiceId, onSuccess]);

  return { send, sending, error };
}
