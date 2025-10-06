"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Activity = {
  id: number;
  action: string;
  message: string;
  createdAt: string
};

interface InvoiceActivityProps {
  invoiceId: number;
  limit?: number;
}

/**
 * Invoice Activity Log
 *
 * Displays recent activity for an invoice (status changes, payments, etc.)
 * Extracted from PostAndMessageSidebar for cleaner separation of concerns.
 */
export function InvoiceActivity({ invoiceId, limit = 10 }: InvoiceActivityProps) {
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId]);

  async function loadActivity() {
    setLoading(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/activity?limit=${limit}`);
      if (response.ok) {
        const { data } = await response.json();
        setActivity(data ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border border-border bg-surface-overlay">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Activity</CardTitle>
      </CardHeader>
      <CardContent className="divide-y">
        {loading ? (
          <p className="py-2 text-sm text-muted-foreground">Loading activity...</p>
        ) : activity.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">No recent activity.</p>
        ) : (
          activity.map((a) => (
            <div key={a.id} className="py-2 text-sm">
              <div className="font-medium">{a.action}</div>
              <div className="text-muted-foreground">{a.message}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {new Date(a.createdAt).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
