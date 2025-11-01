"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { groupMessages, type Message } from "@/lib/chat/group-messages";
import { MessageBubble } from "./message-bubble";
import { DateHeader } from "./date-header";
import { Send } from "lucide-react";

export type ConversationMessage = Message;
type ConversationMessageWithMeta = ConversationMessage & { optimistic?: boolean };

interface ConversationProps {
  invoiceId?: number;
  userId?: number | string; // For admin viewing specific user thread
  currentUserRole?: "ADMIN" | "CLIENT";
}

function mergeMessageLists(
  existing: ConversationMessage[],
  incoming: ConversationMessage[],
): ConversationMessage[] {
  if (incoming.length === 0 && existing.length === 0) return [];
  const map = new Map<number, ConversationMessage>();
  for (const message of existing) {
    map.set(message.id, message);
  }
  for (const message of incoming) {
    map.set(message.id, message);
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

type MessagesPayload = { data: ConversationMessage[] };
type ErrorPayload = { error?: string | { message?: string } };

function isMessagesPayload(payload: unknown): payload is MessagesPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    Array.isArray((payload as { data?: unknown }).data)
  );
}

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === "object" && payload !== null) {
    const possibleError = (payload as ErrorPayload).error;
    if (typeof possibleError === "string") {
      return possibleError;
    }
    if (
      typeof possibleError === "object" &&
      possibleError !== null &&
      typeof (possibleError as { message?: unknown }).message === "string"
    ) {
      return (possibleError as { message: string }).message;
    }
  }
  return fallback;
}

/**
 * Modern conversation component with message grouping
 *
 * Features:
 * - Message grouping by date and sender
 * - Time-based clustering (5-minute threshold)
 * - Own messages on right, others on left
 * - Date separators
 * - Smooth scrolling
 * - Load more pagination
 */
export function Conversation({ invoiceId, userId, currentUserRole }: ConversationProps) {
  const [messages, setMessages] = useState<ConversationMessageWithMeta[]>([]);
  const [content, setContent] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<"ADMIN" | "CLIENT" | null>(null);
  const [pollingEnabled, setPollingEnabled] = useState(true);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingEnabledRef = useRef(true);
  const isFetchingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Fetch current user role if not provided
    if (currentUserRole) {
      setRole(currentUserRole);
    } else {
      fetch("/api/auth/me")
        .then((r) => r.json())
        .then(({ data }) => setRole(data.role))
        .catch(() => {});
    }
  }, [currentUserRole]);

  useEffect(() => {
    pollingEnabledRef.current = pollingEnabled;
  }, [pollingEnabled]);

  const buildEndpoint = useCallback(
    (limit: number, offset: number) => {
      const q = new URLSearchParams({
        order: "desc",
        limit: String(limit),
        offset: String(offset),
      });
      if (invoiceId) q.set("invoiceId", String(invoiceId));

      return userId
        ? `/api/admin/users/${userId}/messages?${q.toString()}`
        : `/api/messages?${q.toString()}`;
    },
    [invoiceId, userId],
  );

  const fetchMessages = useCallback(
    async ({
      page: requestedPage = 0,
      replace = false,
      append = false,
      merge = false,
      scrollToBottom = false,
      background = false,
      force = false,
    }: {
      page?: number;
      replace?: boolean;
      append?: boolean;
      merge?: boolean;
      scrollToBottom?: boolean;
      background?: boolean;
      force?: boolean;
    } = {}) => {
      if (isFetchingRef.current && !force) return;

      const controller = new AbortController();
      abortControllerRef.current?.abort();
      abortControllerRef.current = controller;

      if (!background) {
        setLoading(true);
        setError(null);
      }

      isFetchingRef.current = true;

      const limit = 50;
      const offset = requestedPage * limit;

      try {
        const endpoint = buildEndpoint(limit, offset);
        const response = await fetch(endpoint, { signal: controller.signal });
        const payload = (await response.json().catch(() => null)) as unknown;

        if (!response.ok || !isMessagesPayload(payload)) {
          if (!background) {
            setError(extractErrorMessage(payload, "Failed to load messages"));
          }
          return;
        }

        const list = payload.data.slice().reverse();

        if (!background) {
          setHasMore(list.length === limit);
          setPage(requestedPage);
        }

        setMessages((prev) => {
          const optimistic = prev.filter((item) => item.optimistic);
          const confirmed = prev.filter((item) => !item.optimistic);

          if (replace) {
            return list.concat(optimistic);
          }

          if (append) {
            return [...list, ...confirmed, ...optimistic];
          }

          if (merge) {
            const merged = mergeMessageLists(confirmed, list);
            return merged.concat(optimistic);
          }

          if (requestedPage > 0) {
            return [...list, ...confirmed, ...optimistic];
          }

          return mergeMessageLists(confirmed, list).concat(optimistic);
        });

        if (scrollToBottom) {
          setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 0);
        }
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") {
          return;
        }
        if (!background) {
          setError("Network error. Please check your connection.");
        }
      } finally {
        if (!background) {
          setLoading(false);
        }
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
        isFetchingRef.current = false;
      }
    },
    [buildEndpoint],
  );

  const loadPage = useCallback(
    (p: number, replace = false, scrollToBottom = false) =>
      fetchMessages({
        page: p,
        replace,
        append: !replace && p > 0,
        scrollToBottom,
      }),
    [fetchMessages],
  );

  const refreshMessages = useCallback(
    () =>
      fetchMessages({
        page: 0,
        merge: true,
        background: true,
      }),
    [fetchMessages],
  );

  useEffect(() => {
    setMessages([]);
    setPage(0);
    setHasMore(true);
    setError(null);
    abortControllerRef.current?.abort();
    void loadPage(0, true);
  }, [invoiceId, userId, loadPage]);

  useEffect(() => {
    if (!pollingEnabled) {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
      }
      return;
    }

    let cancelled = false;

    const tick = async () => {
      await refreshMessages();
      if (cancelled || !pollingEnabledRef.current) return;
      pollingTimeoutRef.current = setTimeout(tick, 3000);
    };

    void tick();

    return () => {
      cancelled = true;
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
      }
    };
  }, [refreshMessages, pollingEnabled]);

  useEffect(() => () => {
    abortControllerRef.current?.abort();
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
  }, []);

  function removeOptimisticMessage(id: number) {
    setMessages((prev) => prev.filter((message) => !message.optimistic || message.id !== id));
  }

  function addOptimisticMessage(message: ConversationMessageWithMeta) {
    setMessages((prev) => [...prev, message]);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 0);
  }

  function latestKnownSender(): "ADMIN" | "CLIENT" {
    if (role) return role;
    if (currentUserRole) return currentUserRole;
    return "CLIENT";
  }

  function isMessagePayload(payload: unknown): payload is { data: ConversationMessage } {
    return (
      typeof payload === "object" &&
      payload !== null &&
      typeof (payload as { data?: unknown }).data === "object" &&
      (payload as { data?: { id?: unknown } }).data !== null
    );
  }

  async function send() {
    const trimmed = content.trim();
    if (!trimmed || sending) return;

    const optimisticId = -Date.now();
    const optimisticMessage: ConversationMessageWithMeta = {
      id: optimisticId,
      sender: latestKnownSender(),
      content: trimmed,
      createdAt: new Date().toISOString(),
      optimistic: true,
    };

    setError(null);
    setContent("");
    setSending(true);
    setPollingEnabled(false);
    addOptimisticMessage(optimisticMessage);

    try {
      const payload: { content: string; invoiceId?: number } = { content: trimmed };
      if (invoiceId) payload.invoiceId = invoiceId;

      const sendEndpoint = userId ? `/api/admin/users/${userId}/messages` : "/api/messages";
      const response = await fetch(sendEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const responsePayload = (await response.json().catch(() => null)) as unknown;

      if (!response.ok || !isMessagePayload(responsePayload)) {
        removeOptimisticMessage(optimisticId);
        setError(extractErrorMessage(responsePayload, "Failed to send message"));
        return;
      }

      const saved = responsePayload.data;

      setMessages((prev) => {
        const withoutOptimistic = prev.filter((message) => !message.optimistic || message.id !== optimisticId);
        return mergeMessageLists(withoutOptimistic, [saved]);
      });

      await fetchMessages({ page: 0, replace: true, scrollToBottom: true, force: true });
    } catch {
      removeOptimisticMessage(optimisticId);
      setError("Network error. Please try again.");
    } finally {
      setSending(false);
      setPollingEnabled(true);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  // Group messages by date and sender
  const grouped = groupMessages(messages);

  return (
    <div className="flex min-h-[320px] min-w-0 flex-1 flex-col overflow-hidden bg-transparent">
      {/* Messages area */}
      <div
        ref={containerRef}
        className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-5 sm:py-6 [scrollbar-width:thin] scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border/70"
      >
        {/* Load more button */}
        {hasMore && (
          <div className="flex justify-center pb-4">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full border-border/70 bg-background/80 px-4 py-2 text-xs font-medium shadow-sm shadow-black/5 transition hover:border-border hover:bg-background"
              disabled={loading}
              onClick={() => {
                const n = page + 1;
                setPage(n);
                loadPage(n);
              }}
            >
              {loading ? "Loading..." : "Load older messages"}
            </Button>
          </div>
        )}

        {/* Message groups */}
        {grouped.map((group, groupIndex) => {
          const isFirstGroupWithDate =
            groupIndex === 0 || grouped[groupIndex - 1].date !== group.date;

          return (
            <div key={`${group.date}-${groupIndex}`}>
              {/* Date header */}
              {isFirstGroupWithDate && <DateHeader date={group.date} />}

              {/* Messages in this group */}
              <div className="space-y-2">
                {group.messages.map((message, msgIndex) => {
                  const isOwn = role === message.sender;
                  const isLastInGroup = msgIndex === group.messages.length - 1;

                  return (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      isOwn={isOwn}
                      showTime={isLastInGroup} // Only show time on last message in group
                    />
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Loading skeleton */}
        {messages.length === 0 && loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`flex w-full ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
                <div className="h-16 w-3/4 animate-pulse rounded-lg bg-surface-muted" />
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="rounded-2xl border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
            {error}
          </div>
        )}

        {/* Empty state */}
        {messages.length === 0 && !loading && !error && (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-border/70 bg-background/70 px-6 py-10 text-center text-sm text-muted-foreground">
            No messages yet. Start the conversation!
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Message input */}
      <div className="border-t border-border/70 bg-surface-overlay/90 px-4 py-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-12px_35px_-28px_rgba(0,0,0,0.45)] sm:px-5 sm:py-4">
        <div className="flex items-end gap-2 rounded-2xl border border-border/60 bg-background/95 p-2 shadow-sm shadow-black/10 sm:p-2.5">
          <Textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              // Pause polling while typing, resume when input is empty
              setPollingEnabled(e.target.value.trim() === "");
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Shift+Enter for new line)"
            className="min-h-[56px] max-h-[120px] min-w-0 flex-1 resize-none border-0 bg-transparent px-2.5 py-2.5 text-sm leading-relaxed focus-visible:border-transparent focus-visible:ring-0 sm:min-h-[60px] sm:max-h-[140px] sm:px-3 sm:py-3"
            rows={2}
            disabled={sending}
          />
          <Button
            onClick={send}
            disabled={!content.trim() || sending}
            size="icon"
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-foreground text-background shadow-sm shadow-black/15 transition hover:bg-foreground/90 disabled:bg-foreground/60 sm:h-12 sm:w-12"
            aria-label="Send message"
          >
            <Send className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
