"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Msg = { id: number; sender: "ADMIN" | "CLIENT"; content: string; createdAt: string };

export function InvoiceConversation({ invoiceId }: { invoiceId: number }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [content, setContent] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadPage(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId]);

  async function loadPage(p: number, replace = false) {
    if (loading) return;
    setLoading(true);
    const limit = 50;
    const offset = p * limit;
    const r = await fetch(`/api/invoices/${invoiceId}/messages?order=desc&limit=${limit}&offset=${offset}`);
    setLoading(false);
    if (!r.ok) return;
    const { data } = await r.json();
    const list: Msg[] = (data as Msg[]).slice().reverse();
    setHasMore(list.length === limit);
    if (replace) setMessages(list);
    else setMessages((prev) => [...list, ...prev]);
    if (replace) setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 0);
  }

  async function send() {
    const trimmed = content.trim();
    if (!trimmed) return;
    const r = await fetch(`/api/invoices/${invoiceId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: trimmed }),
    });
    if (!r.ok) return;
    setContent("");
    await loadPage(0, true);
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-center">
        <Button variant="outline" size="sm" disabled={!hasMore || loading} onClick={() => { const n = page + 1; setPage(n); loadPage(n); }}>Load older</Button>
      </div>
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
      <div ref={endRef} />
      <div className="mt-3 space-y-2">
        <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Type your message" />
        <div className="flex justify-end"><Button onClick={send}>Send</Button></div>
      </div>
    </div>
  );
}

