"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, User, Loader2, ArrowLeft } from "lucide-react";
import { Conversation } from "@/components/messages/conversation";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type ConversationRow = {
  id: string;
  email: string;
  role: string;
  clientId: number | null;
  createdAt: string;
  lastMessageAt: string | null;
  lastMessageSender: "ADMIN" | "CLIENT" | null;
  lastMessagePreview: string | null;
  totalMessages: number;
  hasUnread: boolean;
};

/**
 * Admin Messages Page
 *
 * Modern messaging inbox with:
 * - User list on left
 * - Conversation view on right (will use Conversation component)
 * - Search functionality
 */
export default function AdminMessagesPage() {
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fetchConversations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/messages/conversations`);
      const payload = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        throw new Error("Failed to load conversations");
      }
      const data =
        payload &&
        typeof payload === "object" &&
        payload !== null &&
        (payload as { data?: unknown }).data
          ? ((payload as { data?: { conversations?: unknown } }).data
              ?.conversations as unknown[] | undefined) ?? []
          : [];

      const normalized: ConversationRow[] = data
        .filter((item): item is Record<string, unknown> =>
          !!item && typeof item === "object",
        )
        .map((item) => {
          const userId = Number((item as { userId?: unknown }).userId ?? 0);
          const email = String((item as { email?: unknown }).email ?? "");
          return {
            id: String(Number.isFinite(userId) ? userId : ""),
            email,
            role: String((item as { role?: unknown }).role ?? "CLIENT"),
            clientId:
              typeof (item as { clientId?: unknown }).clientId === "number"
                ? ((item as { clientId?: number }).clientId ?? null)
                : null,
            createdAt: String(
              (item as { createdAt?: unknown }).createdAt ?? "",
            ),
            lastMessageAt:
              typeof (item as { lastMessageAt?: unknown }).lastMessageAt ===
              "string"
                ? ((item as { lastMessageAt?: string }).lastMessageAt ?? null)
                : null,
            lastMessageSender: ((): "ADMIN" | "CLIENT" | null => {
              const value = (item as { lastMessageSender?: unknown })
                .lastMessageSender;
              return value === "ADMIN" || value === "CLIENT" ? value : null;
            })(),
            lastMessagePreview:
              typeof (item as { lastMessagePreview?: unknown })
                .lastMessagePreview === "string"
                ? ((item as { lastMessagePreview?: string }).lastMessagePreview ??
                  null)
                : null,
            totalMessages:
              typeof (item as { totalMessages?: unknown }).totalMessages ===
              "number"
                ? ((item as { totalMessages?: number }).totalMessages ?? 0)
                : 0,
            hasUnread:
              typeof (item as { hasUnread?: unknown }).hasUnread === "boolean"
                ? ((item as { hasUnread?: boolean }).hasUnread ?? false)
                : false,
          };
        })
        .filter((item) => item.id !== "");

      setConversations(normalized);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    // Listen for message updates to refresh user list
    const handleMessagesUpdate = () => {
      // Refresh user list when new messages arrive
      fetchConversations();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("messages:updated", handleMessagesUpdate);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("messages:updated", handleMessagesUpdate);
      }
    };
  }, [fetchConversations]);

  const hasSyncedQueryRef = useRef(false);

  useEffect(() => {
    const paramId = searchParams?.get("user");
    hasSyncedQueryRef.current = true;

    if (paramId && paramId !== selected) {
      setSelected(paramId);
    }

    if (!paramId && selected) {
      setSelected(null);
    }
  }, [searchParams, selected]);

  // Memoized and optimized filtering - avoid toLowerCase on every render
  const filtered = useMemo(() => {
    if (!q) return conversations;
    const searchLower = q.toLowerCase();
    return conversations.filter((conversation) =>
      conversation.email.toLowerCase().includes(searchLower)
    );
  }, [conversations, q]);

  const selectedConversation = selected
    ? conversations.find((conversation) => conversation.id === selected)
    : undefined;

  const updateQueryParam = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      if (id) {
        params.set("user", id);
      } else {
        params.delete("user");
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    if (!selected) return;
    const exists = conversations.some((conversation) => conversation.id === selected);
    if (!exists && hasSyncedQueryRef.current) {
      setSelected(null);
      updateQueryParam(null);
    }
  }, [conversations, selected, updateQueryParam]);

  const handleSelectUser = useCallback(
    (id: string) => {
      setSelected(id);
      updateQueryParam(id);
    },
    [updateQueryParam],
  );

  const handleBackToRoster = useCallback(() => {
    setSelected(null);
    updateQueryParam(null);
  }, [updateQueryParam]);

  const rosterPanel = (
    variant: "card" | "sidebar" = "card",
  ) => (
    <div
      className={cn(
        "flex h-full min-h-[420px] flex-col overflow-hidden",
        variant === "card"
          ? "rounded-3xl border border-border/70 bg-surface-overlay/95 shadow-sm shadow-black/5 backdrop-blur"
          : "bg-sidebar/90",
      )}
    >
      <div className="flex items-center justify-between gap-3 px-5 pb-4 pt-5">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted-foreground/70">
            Inbox
          </p>
          <p className="truncate text-lg font-semibold text-foreground">
            Conversations
          </p>
          <p className="text-xs text-muted-foreground">
            Browse contacts to start messaging.
          </p>
        </div>
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-surface-subtle text-muted-foreground">
          <MessageSquare className="h-5 w-5" />
        </div>
      </div>
      <div className="border-t border-border/60 px-5 py-4">
        <Input
          placeholder="Search users"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full rounded-2xl border-border/60 bg-background/90"
        />
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-5 [scrollbar-width:thin] scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border/70">
        {loading ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 px-6 py-10 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">
              Loading conversations…
            </p>
          </div>
        ) : error ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 px-6 py-10 text-center text-sm text-muted-foreground">
            <User className="h-10 w-10 text-muted-foreground/50" />
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 px-6 py-10 text-center text-sm text-muted-foreground">
            <User className="h-10 w-10 text-muted-foreground/50" />
            No users found
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => handleSelectUser(String(u.id))}
                className={cn(
                  "flex w-full min-w-0 items-center gap-3 rounded-2xl border border-transparent bg-background/80 px-4 py-3 text-left transition-all duration-150",
                  selected === u.id
                    ? "border-border/70 bg-surface-muted/80 shadow-sm shadow-black/5"
                    : "hover:border-border/70 hover:bg-surface-muted/60",
                )}
              >
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-border/70 bg-surface-muted text-sm font-semibold text-foreground shadow-sm shadow-black/5">
                  {u.email[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {u.email}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge
                      variant="outline"
                      className="shrink-0 rounded-full border-border/60 bg-surface-overlay px-2 py-0.5 text-[10px] uppercase tracking-[0.25em] text-muted-foreground"
                    >
                      {u.role === "CLIENT" ? "Client" : "Admin"}
                    </Badge>
                    <span className="shrink-0">
                      {u.totalMessages} message{u.totalMessages !== 1 ? "s" : ""}
                    </span>
                    {u.lastMessageAt ? (
                      <span className="shrink-0 text-muted-foreground/70">
                        {new Date(u.lastMessageAt).toLocaleString()}
                      </span>
                    ) : null}
                  </div>
                  {u.lastMessagePreview ? (
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                      {u.lastMessagePreview}
                    </p>
                  ) : null}
                </div>
                {u.hasUnread ? (
                  <span className="ml-2 inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-destructive" />
                ) : null}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <section className="flex min-h-[calc(100vh-220px)] overflow-hidden rounded-3xl border border-border/70 bg-surface-overlay/95 shadow-sm shadow-black/5 backdrop-blur-sm">
        <div className="hidden w-full min-h-0 flex-col lg:flex lg:flex-row lg:items-stretch">
          <aside className="hidden lg:flex lg:w-[360px] lg:flex-shrink-0 lg:flex-col lg:overflow-hidden lg:border-r lg:border-border/70">
            {rosterPanel("sidebar")}
          </aside>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:min-h-[calc(100vh-260px)]">
            {loading && !selectedConversation ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
                <Loader2 className="mb-4 h-12 w-12 animate-spin text-muted-foreground/50" />
                <h2 className="mb-1 text-lg font-semibold text-foreground">
                  Loading conversations…
                </h2>
                <p className="text-sm text-muted-foreground">
                  Fetching your latest messages
                </p>
              </div>
            ) : !selectedConversation ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
                <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <h2 className="mb-1 text-lg font-semibold text-foreground">
                  Select a conversation
                </h2>
                <p className="text-sm text-muted-foreground">
                  Choose a user from your roster to view the thread.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 border-b border-border/70 px-4 py-4 sm:px-6 sm:py-5">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border/70 bg-surface-muted text-sm font-semibold text-foreground shadow-sm shadow-black/5">
                      {selectedConversation.email[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">
                        {selectedConversation.email}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge
                          variant="outline"
                          className="shrink-0 rounded-full border-border/60 bg-surface-overlay px-2 py-0.5 text-[10px] uppercase tracking-[0.25em]"
                        >
                          {selectedConversation.role === "CLIENT"
                            ? "Client"
                            : "Admin"}
                        </Badge>
                        <span className="shrink-0">
                          {selectedConversation.totalMessages} message
                          {selectedConversation.totalMessages !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <Conversation
                  key={selectedConversation.id}
                  userId={selectedConversation.id}
                  currentUserRole="ADMIN"
                />
              </>
            )}
          </div>
        </div>

        <div className="flex w-full flex-1 flex-col lg:hidden">
          {selectedConversation ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-center gap-3 border-b border-border/70 px-4 py-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full border border-border/60"
                  onClick={handleBackToRoster}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {selectedConversation.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedConversation.role === "CLIENT" ? "Client" : "Admin"}
                  </p>
                </div>
              </div>
              <Conversation
                key={`mobile-${selectedConversation.id}`}
                userId={selectedConversation.id}
                currentUserRole="ADMIN"
              />
            </div>
          ) : (
            <div className="flex flex-1 flex-col">
              {rosterPanel("card")}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
