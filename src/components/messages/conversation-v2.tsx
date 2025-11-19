"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageBubble } from "@/components/messages/message-bubble";
import { DateHeader } from "@/components/messages/date-header";
import { groupMessages } from "@/lib/chat/group-messages";
import { useThreadV2, type Message } from "@/hooks/use-thread-v2";
import { useSendMessageV2 } from "@/hooks/use-send-message-v2";
import { useMarkSeenV2 } from "@/hooks/use-mark-seen-v2";
import { Send } from "lucide-react";

interface Props {
  userId?: number | string | null;
  invoiceId?: number | null;
  currentUserRole: "ADMIN" | "CLIENT";
}

export function ConversationV2({ userId, invoiceId, currentUserRole }: Props) {
  const [content, setContent] = useState("");
  const {
    messages,
    nextCursor,
    loading,
    error,
    revalidating,
    loadMore,
    latest,
    addMessage,
  } = useThreadV2({ userId, invoiceId, role: currentUserRole });

  const { send, sending, error: sendError } = useSendMessageV2({
    userId,
    role: currentUserRole,
    invoiceId,
    onSuccess: (msg) => {
      addMessage(msg);
    },
  });

  useMarkSeenV2({ enabled: true, lastSeenAt: latest, conversationUserId: typeof userId === "string" ? Number(userId) : (userId ?? null) });

  const handleSend = async () => {
    const value = content.trim();
    if (!value) return;
    setContent("");
    await send(value);
  };

  const grouped = useMemo(() => groupMessages(messages, "asc"), [messages]);

  // Auto-scroll to newest message (bottom) after initial load and when sending
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hasAutoScrolledRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;
    if (messages.length === 0) return;
    if (loading && !hasAutoScrolledRef.current) return;
    requestAnimationFrame(() => {
      containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: hasAutoScrolledRef.current ? "smooth" : "auto" });
      hasAutoScrolledRef.current = true;
    });
  }, [messages.length, loading]);

  return (
    <div className="flex min-h-[360px] min-w-0 flex-1 flex-col overflow-hidden bg-transparent md:min-h-[calc(100vh-280px)] md:max-h-[calc(100vh-280px)]">
      <div ref={containerRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-5 sm:py-6 [scrollbar-width:thin] scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border/70">
        {nextCursor && (
          <div className="flex justify-center pb-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => loadMore()} disabled={revalidating || loading}>
              {revalidating ? "Loading…" : "Load older messages"}
            </Button>
          </div>
        )}

        {grouped.map((group, idx) => {
          const isFirstGroupWithDate = idx === 0 || grouped[idx - 1].date !== group.date;
          return (
            <div key={`${group.date}-${idx}`}>
              {isFirstGroupWithDate && <DateHeader date={group.date} />}
              <div className="space-y-2">
                {group.messages.map((m, mIdx) => (
                  <MessageBubble key={m.id} message={m as Message} isOwn={currentUserRole === m.sender} showTime={mIdx === group.messages.length - 1} />
                ))}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
              <span>Loading messages…</span>
            </div>
          </div>
        )}

        {!loading && grouped.length === 0 && !error && (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-border/70 bg-background/70 px-6 py-10 text-center text-sm text-muted-foreground">
            No messages yet. Start the conversation!
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
            {error}
          </div>
        )}

        {sendError && (
          <div className="rounded-2xl border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
            {sendError}
          </div>
        )}

      </div>

      <div className="border-t border-border/70 bg-surface-overlay/90 px-4 py-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-12px_35px_-28px_rgba(0,0,0,0.45)] sm:px-5 sm:py-4">
        <div className="flex items-end gap-2 rounded-2xl border border-border/60 bg-background/95 p-2 shadow-sm shadow-black/10 sm:p-2.5">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type a message..."
            className="min-h-[56px] max-h-[120px] min-w-0 flex-1 resize-none border-0 bg-transparent px-2.5 py-2.5 text-sm leading-relaxed focus-visible:border-transparent focus-visible:ring-0 sm:min-h-[60px] sm:max-h-[140px] sm:px-3 sm:py-3"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            disabled={sending}
          />
          <Button onClick={handleSend} disabled={!content.trim() || sending} size="icon" className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-foreground text-background shadow-sm shadow-black/15 transition hover:bg-foreground/90 disabled:bg-foreground/60 sm:h-12 sm:w-12" aria-label="Send message">
            <Send className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
