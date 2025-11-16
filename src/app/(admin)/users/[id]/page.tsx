"use client";

import { useParams } from "next/navigation";
import { ConversationV2 } from "@/components/messages/conversation-v2";
import { Button } from "@/components/ui/button";

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const userId = Number(params.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">User Conversation</h1>
        <Button variant="outline" onClick={() => history.back()}>Back</Button>
      </div>
      <div className="rounded-3xl border border-border/70 bg-surface-overlay/95 shadow-sm shadow-black/5">
        <ConversationV2 userId={userId} currentUserRole="ADMIN" />
      </div>
    </div>
  );
}
