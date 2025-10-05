"use client";

import { Conversation } from "@/components/messages/conversation";

export default function ClientMessagesPage() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4">
        <div>
          <h1 className="text-lg font-semibold">Messages</h1>
          <p className="text-sm text-muted-foreground">Left: you, Right: studio</p>
        </div>
        <div className="rounded-lg border border-border bg-surface-overlay p-3">
          <Conversation />
        </div>
      </div>
      <aside className="space-y-4">
        <div className="rounded-lg border border-border bg-surface-overlay p-3">
          <h2 className="mb-2 text-sm font-medium">User Center</h2>
          <p className="text-xs text-muted-foreground">Access account, orders, and quick order from the sidebar.</p>
        </div>
      </aside>
    </div>
  );
}
