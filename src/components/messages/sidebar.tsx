"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Activity = { id: number; action: string; message: string; createdAt: string };
type Msg = { id: number; sender: "ADMIN" | "CLIENT"; content: string; createdAt: string };

export function PostAndMessageSidebar({ invoiceId }: { invoiceId: number }) {
  const [activity, setActivity] = useState<Activity[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);

  useEffect(() => {
    (async () => {
      const [a, m] = await Promise.all([
        fetch(`/api/invoices/${invoiceId}/activity?limit=10`).then((r) => r.ok ? r.json() : { data: [] }),
        fetch(`/api/invoices/${invoiceId}/messages?order=desc&limit=10`).then((r) => r.ok ? r.json() : { data: [] }),
      ]);
      setActivity(a.data ?? []);
      const recent = (m.data ?? []).slice().reverse();
      setMessages(recent);
    })();
  }, [invoiceId]);

  return (
    <div className="space-y-4">
      <Card className="border border-border bg-surface-overlay">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Activity</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {activity.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">No recent activity.</p>
          ) : (
            activity.map((a) => (
              <div key={a.id} className="py-2 text-sm">
                <div className="font-medium">{a.action}</div>
                <div className="text-muted-foreground">{a.message}</div>
                <div className="mt-1 text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleString()}</div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border border-border bg-surface-overlay">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Recent Messages</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No messages yet.</p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className="rounded-md border border-border bg-surface-overlay p-2 text-sm">
                <div className="whitespace-pre-wrap">{m.content}</div>
                <div className="mt-1 text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleString()}</div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

