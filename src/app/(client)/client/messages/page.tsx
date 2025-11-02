"use client";

import { useEffect, useState } from "react";
import { Conversation } from "@/components/messages/conversation";
import { MessageSquare, Loader2 } from "lucide-react";

/**
 * Client Messages Page
 *
 * Provides a dedicated messaging interface for clients to communicate with admins
 * Uses the same Conversation component as the admin side
 */
export default function ClientMessagesPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (r) => {
        if (!r.ok) return;
        const { data } = await r.json();
        setUser({ id: String(data.id), email: String(data.email) });
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-border bg-surface-elevated/80 p-4 shadow-sm shadow-black/5 backdrop-blur sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <MessageSquare className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Messages
            </h1>
            <p className="text-sm text-muted-foreground">
              Chat with our team about your orders
            </p>
          </div>
        </div>
      </header>

      <section className="flex min-h-[calc(100vh-220px)] overflow-hidden rounded-3xl border border-border/70 bg-surface-overlay/95 shadow-sm shadow-black/5 backdrop-blur-sm">
        {loading ? (
          <div className="flex min-h-[calc(100vh-280px)] flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground">Loading messages…</p>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <Conversation currentUserRole="CLIENT" />
          </div>
        )}
      </section>
    </div>
  );
}
