"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, User, Loader2, ArrowLeft } from "lucide-react";
import { ConversationV2 } from "@/components/messages/conversation-v2";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAdminConversationsV2 } from "@/hooks/use-admin-conversations-v2";

export default function AdminMessagesPage() {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const { items: conversations, loading, error, reload } = useAdminConversationsV2(q);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filtered = useMemo(() => conversations, [conversations]);

  const selectedConversation = selected
    ? conversations.find((conversation) => String(conversation.userId) === selected)
    : undefined;

  const updateQueryParam = (id: string | null) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (id) {
      params.set("user", id);
    } else {
      params.delete("user");
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  useEffect(() => {
    const initial = searchParams?.get("user");
    if (initial) setSelected(initial);
  }, [searchParams]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleMessagesUpdate = () => reload();
      window.addEventListener("messages:updated", handleMessagesUpdate);
      return () => window.removeEventListener("messages:updated", handleMessagesUpdate);
    }
  }, [reload]);

  const handleSelectUser = (id: string) => {
    setSelected(id);
    updateQueryParam(id);
  };

  const handleBackToRoster = () => {
    setSelected(null);
    updateQueryParam(null);
  };

  const rosterPanel = (variant: "card" | "sidebar" = "card") => (
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
          <p className="text-xs text-muted-foreground">Browse contacts to start messaging.</p>
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
            <p className="text-sm text-muted-foreground">Loading conversations…</p>
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
                key={u.userId}
                type="button"
                onClick={() => handleSelectUser(String(u.userId))}
                className={cn(
                  "flex w-full min-w-0 items-center gap-3 rounded-2xl border border-transparent bg-background/80 px-4 py-3 text-left transition-all duration-150",
                  selected === String(u.userId)
                    ? "border-border/70 bg-surface-muted/80 shadow-sm shadow-black/5"
                    : "hover:border-border/70 hover:bg-surface-muted/60",
                )}
              >
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-border/70 bg-surface-muted text-sm font-semibold text-foreground shadow-sm shadow-black/5">
                  {u.email[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{u.email}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge
                      variant="outline"
                      className="shrink-0 rounded-full border-border/60 bg-surface-overlay px-2 py-0.5 text-[10px] uppercase tracking-[0.25em] text-muted-foreground"
                    >
                      Client
                    </Badge>
                    <span className="shrink-0">{u.totalMessages} message{u.totalMessages !== 1 ? "s" : ""}</span>
                    {u.lastMessage?.createdAt ? (
                      <span className="shrink-0 text-muted-foreground/70">
                        {new Date(u.lastMessage.createdAt).toLocaleString()}
                      </span>
                    ) : null}
                  </div>
                  {u.lastMessage?.content ? (
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{u.lastMessage.content}</p>
                  ) : null}
                </div>
                {u.hasUnread ? <span className="ml-2 inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-destructive" /> : null}
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
                <h2 className="mb-1 text-lg font-semibold text-foreground">Loading conversations…</h2>
                <p className="text-sm text-muted-foreground">Fetching your latest messages</p>
              </div>
            ) : !selectedConversation ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
                <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <h2 className="mb-1 text-lg font-semibold text-foreground">Select a conversation</h2>
                <p className="text-sm text-muted-foreground">Choose a user from your roster to view the thread.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 border-b border-border/70 px-4 py-4 sm:px-6 sm:py-5">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border/70 bg-surface-muted text-sm font-semibold text-foreground shadow-sm shadow-black/5">
                      {selectedConversation.email[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{selectedConversation.email}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge
                          variant="outline"
                          className="shrink-0 rounded-full border-border/60 bg-surface-overlay px-2 py-0.5 text-[10px] uppercase tracking-[0.25em]"
                        >
                          Client
                        </Badge>
                        {selectedConversation.lastMessage?.createdAt ? (
                          <span className="shrink-0 text-muted-foreground/70">
                            Last message {new Date(selectedConversation.lastMessage.createdAt).toLocaleString()}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
                <ConversationV2
                  key={`thread-${selectedConversation.userId}`}
                  userId={selectedConversation.userId}
                  currentUserRole="ADMIN"
                />
              </>
            )}
          </div>
        </div>

        {/* Mobile layout */}
        <div className="flex w-full flex-col lg:hidden">
          {!selectedConversation ? (
            rosterPanel("card")
          ) : (
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
                  <p className="truncate text-sm font-semibold text-foreground">{selectedConversation.email}</p>
                  <p className="text-xs text-muted-foreground">Client</p>
                </div>
              </div>
              <ConversationV2
                key={`mobile-${selectedConversation.userId}`}
                userId={selectedConversation.userId}
                currentUserRole="ADMIN"
              />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
