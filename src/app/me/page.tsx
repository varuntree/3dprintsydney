"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Msg = { id: number; sender: "ADMIN" | "CLIENT"; content: string; createdAt: string };

export default function MePage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then(async (r) => {
      if (!r.ok) router.replace("/login");
    });
    refresh();
  }, [router]);

  async function refresh() {
    const res = await fetch("/api/messages");
    if (!res.ok) return;
    const { data } = await res.json();
    setMessages(data);
  }

  async function send() {
    setError(null);
    const trimmed = content.trim();
    if (!trimmed) return;
    const res = await fetch("/api/messages", {
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

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Messages</h1>
          <p className="text-sm text-muted-foreground">Chat with the studio. Responses appear here.</p>
        </div>
        <Button variant="outline" onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); window.location.href = '/login'; }}>Logout</Button>
      </div>
      <div className="space-y-3 rounded-lg border border-border bg-surface-overlay p-4">
        <div className="space-y-2">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No messages yet.</p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className="text-sm">
                <span className="mr-2 font-medium">{m.sender === "ADMIN" ? "Admin" : "You"}:</span>
                <span className="whitespace-pre-wrap">{m.content}</span>
              </div>
            ))
          )}
        </div>
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        <div className="space-y-2">
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Type your message" />
          <div className="flex justify-end">
            <Button onClick={send}>Send</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
