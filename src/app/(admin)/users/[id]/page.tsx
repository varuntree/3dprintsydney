"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Msg = { id: number; sender: "ADMIN" | "CLIENT"; content: string; createdAt: string };

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const userId = Number(params.id);
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh() {
    const res = await fetch(`/api/admin/users/${userId}/messages`);
    if (!res.ok) {
      router.replace("/login");
      return;
    }
    const { data } = await res.json();
    setMessages(data);
  }

  async function send() {
    setError(null);
    const trimmed = content.trim();
    if (!trimmed) return;
    const res = await fetch(`/api/admin/users/${userId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: trimmed }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Failed to send");
      return;
    }
    setContent("");
    await refresh();
  }

  async function removeUser() {
    if (!confirm("Delete this user and all data? This cannot be undone.")) return;
    const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    if (res.ok) router.replace("/users");
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">User Thread</h1>
        <Button variant="destructive" onClick={removeUser}>Delete User</Button>
      </div>
      <div className="space-y-3 rounded-lg border border-border bg-surface-overlay p-4">
        <div className="space-y-2">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No messages.</p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className="text-sm">
                <span className="mr-2 font-medium">{m.sender === "ADMIN" ? "Admin" : "User"}:</span>
                <span className="whitespace-pre-wrap">{m.content}</span>
              </div>
            ))
          )}
        </div>
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        <div className="space-y-2">
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Type a reply" />
          <div className="flex justify-end">
            <Button onClick={send}>Send</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
