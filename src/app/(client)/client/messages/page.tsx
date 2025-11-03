"use client";

import { Conversation } from "@/components/messages/conversation";

/**
 * Client Messages Page
 *
 * Provides a dedicated messaging interface for clients to communicate with admins
 * Uses the same Conversation component as the admin side
 */
export default function ClientMessagesPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <section className="flex min-h-0 flex-1 overflow-hidden rounded-3xl border border-border/70 bg-surface-overlay/95 shadow-sm shadow-black/5 backdrop-blur-sm">
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-4 sm:px-6 sm:py-5">
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground/70">
                Messages
              </p>
              <h1 className="text-lg font-semibold tracking-tight text-foreground">
                Chat with our team about your orders
              </h1>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <Conversation currentUserRole="CLIENT" />
          </div>
        </div>
      </section>
    </div>
  );
}
