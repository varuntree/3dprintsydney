"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Conversations</h1>
        <MessageSquare className="h-5 w-5 text-muted-foreground" />
      </div>
      <Input
        placeholder="Search users..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="w-full"
      />
      <div className="h-full overflow-y-auto rounded-lg border border-border bg-surface-overlay">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">Loading conversations…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <User className="mb-2 h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No users found</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((u) => (
              <li
                key={u.id}
                className={cn(
                  "cursor-pointer p-4 transition-colors hover:bg-surface-muted",
                  selected === u.id && "bg-surface-muted",
                )}
                onClick={() => handleSelectUser(String(u.id), closeOnSelect)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white">
                    {u.email[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="truncate font-medium">{u.email}</div>
                    <div className="text-xs text-muted-foreground">
                      {u.messageCount} message{u.messageCount !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-200px)] flex-col gap-4 lg:flex-row">
      {/* User List Sidebar */}
      <aside className="hidden w-full flex-shrink-0 space-y-3 lg:block lg:w-80">
        {rosterPanel(false)}
      </aside>

      {/* Conversation Area */}
      <div className="flex-1 rounded-lg border border-border bg-surface-overlay">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 lg:hidden">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {selectedUser?.email ?? "Select a conversation"}
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
        {loading ? (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <Loader2 className="mb-4 h-16 w-16 animate-spin text-muted-foreground/50" />
            <h2 className="mb-2 text-lg font-semibold">Loading conversations...</h2>
            <p className="text-sm text-muted-foreground">
              Fetching your messages
            </p>
          </div>
        ) : !selected ? (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <MessageSquare className="mb-4 h-16 w-16 text-muted-foreground/50" />
            <h2 className="mb-2 text-lg font-semibold">Select a conversation</h2>
            <p className="text-sm text-muted-foreground">
              Choose a user from the list to view their messages
            </p>
          </div>
        ) : (
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-border p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white">
                {selectedUser?.email[0]?.toUpperCase() ?? "?"}
              </div>
              <div>
                <div className="font-medium">{selectedUser?.email}</div>
                <div className="text-xs text-muted-foreground">
                  {selectedUser?.role === "CLIENT" ? "Client" : "Admin"}
                </div>
              </div>
            </div>

            {/* Conversation Component */}
            <Conversation key={selected} userId={selected} currentUserRole="ADMIN" />
          </div>
        )}
      </div>
      <Sheet open={rosterOpen} onOpenChange={setRosterOpen}>
        <SheetContent className="h-[80vh] overflow-y-auto rounded-t-3xl bg-background p-6 sm:max-w-md sm:rounded-3xl">
          <SheetHeader className="px-0">
            <SheetTitle>Conversations</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">{rosterPanel(true)}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
