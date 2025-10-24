"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MessageSquare, User, Loader2 } from "lucide-react";
import { Conversation } from "@/components/messages/conversation";

type UserRow = {
  id: string;
  email: string;
  role: string;
  clientId: number | null;
  createdAt: string;
  messageCount: number;
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
  const [users, setUsers] = useState<UserRow[]>([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rosterOpen, setRosterOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    const r = await fetch(`/api/admin/users`);
    if (!r.ok) {
      setLoading(false);
      return;
    }
    const { data } = await r.json();
    const normalized: UserRow[] = (data as Array<Record<string, unknown>>).map((u) => ({
      id: String(u.id ?? ''),
      email: String(u.email ?? ''),
      role: String(u.role ?? ''),
      clientId: typeof u.clientId === 'number' ? (u.clientId as number) : null,
      createdAt: String(u.createdAt ?? ''),
      messageCount: typeof u.messageCount === 'number' ? (u.messageCount as number) : 0,
    }));
    setUsers(normalized);
    setLoading(false);
  }

  const filtered = users.filter(
    (u) => !q || u.email.toLowerCase().includes(q.toLowerCase())
  );

  const selectedUser = selected ? users.find((u) => u.id === selected) : undefined;

  function handleSelectUser(id: string, closeRoster = false) {
    setSelected(id);
    if (closeRoster) {
      setRosterOpen(false);
    }
  }

  const rosterPanel = (closeOnSelect: boolean) => (
    <Card className="rounded-3xl border border-border/60 bg-surface-overlay/95 shadow-sm shadow-black/5 backdrop-blur">
      <CardHeader className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold text-foreground">
            Conversations
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Browse contacts to start messaging.
          </CardDescription>
        </div>
        <div className="flex size-10 items-center justify-center rounded-xl bg-surface-subtle text-muted-foreground">
          <MessageSquare className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="Search users..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full"
        />
        <ScrollArea className="max-h-[60vh] rounded-2xl border border-border/60 bg-background/85">
          {loading ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 px-6 py-10 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground">Loading conversations…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 px-6 py-10 text-center text-sm text-muted-foreground">
              <User className="h-10 w-10 text-muted-foreground/50" />
              No users found
            </div>
          ) : (
            <div className="flex flex-col gap-2 p-2">
              {filtered.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleSelectUser(String(u.id), closeOnSelect)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border border-transparent bg-transparent px-3 py-3 text-left transition-all duration-150",
                    selected === u.id
                      ? "border-border/70 bg-surface-muted/80 shadow-sm shadow-black/5"
                      : "hover:border-border/60 hover:bg-surface-muted/60",
                  )}
                >
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600/90 via-blue-500/90 to-sky-500/80 text-sm font-semibold text-white shadow-sm shadow-blue-500/40">
                    {u.email[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{u.email}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge
                        variant="outline"
                        className="rounded-full border-border/60 bg-surface-overlay px-2 py-0.5 text-[10px] uppercase tracking-[0.25em] text-muted-foreground"
                      >
                        {u.role === "CLIENT" ? "Client" : "Admin"}
                      </Badge>
                      <span>{u.messageCount} message{u.messageCount !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex w-full min-h-[min(70vh,720px)] flex-col gap-5 lg:flex-row lg:items-stretch lg:gap-6">
      {/* User List Sidebar */}
      <aside className="hidden w-full max-w-sm flex-shrink-0 lg:block">
        {rosterPanel(false)}
      </aside>

      {/* Conversation Area */}
      <section className="flex min-h-[480px] flex-1 flex-col overflow-hidden rounded-3xl border border-border/70 bg-surface-overlay/95 shadow-sm shadow-black/5 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-4 lg:hidden">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {selectedUser?.email ?? "Messages"}
            </p>
            <p className="text-xs text-muted-foreground">
              {selectedUser
                ? selectedUser.role === "CLIENT"
                  ? "Client"
                  : "Admin"
                : "Browse contacts to start messaging"}
            </p>
          </div>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => setRosterOpen(true)}
          >
            Browse
          </Button>
        </div>
        <div className="relative flex flex-1 flex-col">
          {loading ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
              <Loader2 className="mb-4 h-12 w-12 animate-spin text-muted-foreground/50" />
              <h2 className="mb-1 text-lg font-semibold text-foreground">Loading conversations…</h2>
              <p className="text-sm text-muted-foreground">Fetching your latest messages</p>
            </div>
          ) : !selected ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
              <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h2 className="mb-1 text-lg font-semibold text-foreground">Select a conversation</h2>
              <p className="text-sm text-muted-foreground">Choose a user from your roster to view the thread.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 border-b border-border/70 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 via-blue-500 to-sky-500 text-sm font-semibold text-white shadow-sm shadow-blue-500/40">
                    {selectedUser?.email[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{selectedUser?.email}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge
                        variant="outline"
                        className="rounded-full border-border/60 bg-surface-overlay px-2 py-0.5 text-[10px] uppercase tracking-[0.25em]"
                      >
                        {selectedUser?.role === "CLIENT" ? "Client" : "Admin"}
                      </Badge>
                      <span>{selectedUser?.messageCount ?? 0} message{(selectedUser?.messageCount ?? 0) !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full border-border/70 text-xs font-medium text-muted-foreground hover:text-foreground lg:hidden"
                  onClick={() => setRosterOpen(true)}
                >
                  Switch
                </Button>
              </div>
              <Conversation key={selected} userId={selected} currentUserRole="ADMIN" />
            </>
          )}
        </div>
      </section>

      <Sheet open={rosterOpen} onOpenChange={setRosterOpen}>
        <SheetContent className="flex h-[85vh] w-full max-w-full flex-col overflow-hidden rounded-t-3xl bg-surface-overlay/95 p-0 backdrop-blur-sm sm:max-w-md sm:rounded-3xl">
          <SheetHeader className="px-6 pt-[calc(1.25rem+env(safe-area-inset-top))]">
            <SheetTitle className="text-base font-semibold">Conversations</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-10">
            <div className="space-y-4">{rosterPanel(true)}</div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
