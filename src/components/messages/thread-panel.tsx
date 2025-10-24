"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Conversation } from "@/components/messages/conversation";

type Activity = { id: number; action: string; message: string; createdAt: string };

export function ThreadPanel({ invoiceId }: { invoiceId: number }) {
  const [tab, setTab] = useState("activity");
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tab !== "activity") return;
    (async () => {
      setLoading(true);
      const r = await fetch(`/api/invoices/${invoiceId}/activity?limit=50&offset=0`);
      setLoading(false);
      if (!r.ok) return;
      const { data } = await r.json();
      setActivity(data);
    })();
  }, [invoiceId, tab]);

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full max-w-full space-y-3">
      <TabsList className="flex w-full flex-wrap gap-2 rounded-3xl border border-border bg-surface-overlay p-1">
        <TabsTrigger value="activity">Activity</TabsTrigger>
        <TabsTrigger value="messages">Messages</TabsTrigger>
      </TabsList>
      <TabsContent value="activity">
        <Card className="w-full max-w-full border border-border bg-surface-overlay">
          <CardContent className="divide-y">
            {loading ? (
              <p className="py-3 text-sm text-muted-foreground">Loading…</p>
            ) : activity.length === 0 ? (
              <p className="py-3 text-sm text-muted-foreground">No recent activity.</p>
            ) : (
              activity.map((a) => (
                <div key={a.id} className="py-3 text-sm">
                  <div className="font-medium">{a.action}</div>
                  <div className="text-muted-foreground">{a.message}</div>
                  <div className="text-xs text-muted-foreground mt-1">{new Date(a.createdAt).toLocaleString()}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="messages">
        <Card className="w-full max-w-full overflow-hidden border border-border bg-surface-overlay">
          <CardContent className="p-0">
            <Conversation invoiceId={invoiceId} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

