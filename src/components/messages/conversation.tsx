"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { groupMessages, type Message } from "@/lib/chat/group-messages";
import { MessageBubble } from "./message-bubble";
import { DateHeader } from "./date-header";
import { Send } from "lucide-react";

export type ConversationMessage = Message;

interface ConversationProps {
  invoiceId?: number;
  userId?: number; // For admin viewing specific user thread
  currentUserRole?: "ADMIN" | "CLIENT";
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
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [content, setContent] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<"ADMIN" | "CLIENT" | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

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
    loadPage(0, true);
    // reset when switching thread
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId, userId]);

  async function loadPage(p: number, replace = false) {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const limit = 50;
      const offset = p * limit;
      const q = new URLSearchParams({ order: "desc", limit: String(limit), offset: String(offset) });
      if (invoiceId) q.set("invoiceId", String(invoiceId));

      // Determine endpoint based on props
      const endpoint = userId
        ? `/api/admin/users/${userId}/messages?${q.toString()}`
        : `/api/messages?${q.toString()}`;

      const r = await fetch(endpoint);
      setLoading(false);

      if (!r.ok) {
        const errorData = await r.json().catch(() => ({ error: "Failed to load messages" }));
        setError(errorData.error || "Failed to load messages");
        return;
      }

      const { data } = await r.json();
      const list: ConversationMessage[] = (data as ConversationMessage[]).slice().reverse();
      setHasMore(list.length === limit);
      if (replace) setMessages(list);
      else setMessages((prev) => [...list, ...prev]);
      if (replace) setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 0);
    } catch {
      setLoading(false);
      setError("Network error. Please check your connection.");
    }
  }

  async function send() {
    const trimmed = content.trim();
    if (!trimmed) return;

    setError(null);
    try {
      const payload: { content: string; invoiceId?: number } = { content: trimmed };
      if (invoiceId) payload.invoiceId = invoiceId;

      // Determine endpoint for sending
      const sendEndpoint = userId
        ? `/api/admin/users/${userId}/messages`
        : "/api/messages";

      const r = await fetch(sendEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!r.ok) {
        const errorData = await r.json().catch(() => ({ error: "Failed to send message" }));
        setError(errorData.error || "Failed to send message");
        return;
      }

      setContent("");
      await loadPage(0, true);
    } catch {
      setError("Network error. Please try again.");
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
    <div className="flex h-full flex-col">
      {/* Messages area */}
      <div
        ref={containerRef}
        className="flex-1 space-y-1 overflow-y-auto px-4 py-4"
        style={{ maxHeight: "calc(100vh - 300px)" }}
      >
        {/* Load more button */}
        {hasMore && (
          <div className="flex justify-center pb-4">
            <Button
              variant="outline"
              size="sm"
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
              <div className="space-y-1">
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
                <div className="h-16 w-3/4 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
            {error}
          </div>
        )}

        {/* Empty state */}
        {messages.length === 0 && !loading && !error && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">No messages yet. Start the conversation!</p>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Message input */}
      <div className="border-t border-border bg-surface-overlay p-4">
        <div className="flex gap-2">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Shift+Enter for new line)"
            className="min-h-[60px] max-h-[120px] resize-none"
            rows={2}
          />
          <Button onClick={send} disabled={!content.trim()} size="icon" className="h-[60px] w-[60px]">
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
