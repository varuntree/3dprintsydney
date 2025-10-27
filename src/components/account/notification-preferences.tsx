"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function NotificationPreferences() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notifyOnJobStatus, setNotifyOnJobStatus] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  async function loadPreferences() {
    try {
      const res = await fetch("/api/client/notifications");
      if (!res.ok) {
        toast.error("Failed to load preferences");
        return;
      }
      const { data } = await res.json();
      setNotifyOnJobStatus(data.notifyOnJobStatus ?? false);
    } catch (error) {
      toast.error("Error loading preferences");
    } finally {
      setLoading(false);
    }
  }

  async function updatePreference(value: boolean) {
    setSaving(true);
    setNotifyOnJobStatus(value);

    try {
      const res = await fetch("/api/client/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifyOnJobStatus: value }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Failed to update preference" }));
        toast.error(errorData.error || "Failed to update preference");
        // Revert on error
        setNotifyOnJobStatus(!value);
        return;
      }

      toast.success("Preference updated");
    } catch (error) {
      toast.error("Error updating preference");
      // Revert on error
      setNotifyOnJobStatus(!value);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-background p-3">
        <div className="flex-1">
          <Label htmlFor="notify-job-status" className="text-sm font-medium">
            Job Status Updates
          </Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Receive notifications when your job status changes
          </p>
        </div>
        <Switch
          id="notify-job-status"
          checked={notifyOnJobStatus}
          onCheckedChange={updatePreference}
          disabled={saving}
        />
      </div>
    </div>
  );
}
