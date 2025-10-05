"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type UserRow = { id: number; email: string; role: string; clientId: number | null; createdAt: string; messageCount: number };
type Msg = { id: number; sender: "ADMIN" | "CLIENT"; content: string; createdAt: string };

export default function AdminMessagesPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [content, setContent] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    const r = await fetch(`/api/admin/users`);
    if (!r.ok) return;
    const { data } = await r.json();
    setUsers(data);
  }

  async function loadThread(userId: number, p = 0, replace = true) {
    const limit = 50;
    const offset = p * limit;
    const r = await fetch(`/api/admin/users/${userId}/messages?order=desc&limit=${limit}&offset=${offset}`);
    if (!r.ok) return;
    const { data } = await r.json();
    const list: Msg[] = (data as Msg[]).slice().reverse();
    setHasMore(list.length === limit);
    if (replace) setMessages(list);
    else setMessages((prev) => [...list, ...prev]);
  }

  async function send() {
    if (!selected) return;
    const trimmed = content.trim();
    if (!trimmed) return;
    const r = await fetch(`/api/admin/users/${selected}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: trimmed }) });
    if (!r.ok) return;
    setContent("");
    await loadThread(selected, 0, true);
  }

  const filtered = users.filter((u) => !q || u.email.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <aside className="space-y-3 lg:col-span-1">
        <Input placeholder="Search users" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="rounded-lg border border-border bg-surface-overlay">
          <ul className="max-h-[70vh] divide-y overflow-auto">
            {filtered.map((u) => (
              <li key={u.id} className={`cursor-pointer p-3 text-sm ${selected === u.id ? 'bg-surface-muted' : ''}`} onClick={() => { setSelected(u.id); setPage(0); loadThread(u.id, 0, true); }}>
                <div className="font-medium">{u.email}</div>
                <div className="text-xs text-muted-foreground">{u.messageCount} messages</div>
              </li>
            ))}
          </ul>
        </div>
      </aside>
      <div className="lg:col-span-2 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Messages</h1>
          <Button variant="outline" size="sm" disabled={!selected || !hasMore} onClick={() => { if (!selected) return; const n = page + 1; setPage(n); loadThread(selected, n, false); }}>Load older</Button>
        </div>
        <div className="rounded-lg border border-border bg-surface-overlay p-3">
          {!selected ? (
            <p className="text-sm text-muted-foreground">Select a user to view thread.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {messages.map((m) => (
                <div key={m.id} className={m.sender === "CLIENT" ? "sm:col-start-1" : "sm:col-start-2"}>
                  <div className="rounded-md border border-border bg-surface-overlay p-2 text-sm">
                    <div className="whitespace-pre-wrap">{m.content}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 space-y-2">
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Type your message" />
            <div className="flex justify-end"><Button onClick={send} disabled={!selected}>Send</Button></div>
          </div>
        </div>
      </div>
    </div>
  );
}
