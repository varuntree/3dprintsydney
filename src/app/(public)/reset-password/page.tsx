"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const search = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const code = search.get("code");
    if (!code) {
      setStatus("error");
      return;
    }
    const supabase = getBrowserSupabase();
    supabase.auth
      .exchangeCodeForSession(code)
      .then(({ error }) => {
        if (error) {
          toast.error(error.message ?? "Reset link invalid or expired");
          setStatus("error");
        } else {
          setStatus("ready");
        }
      })
      .catch(() => {
        toast.error("Reset link invalid or expired");
        setStatus("error");
      });
  }, [search]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setSubmitting(true);
    try {
      const supabase = getBrowserSupabase();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        toast.error(error.message ?? "Failed to update password");
        return;
      }
      toast.success("Password updated. Please sign in again.");
      await supabase.auth.signOut();
      router.replace("/login");
    } catch (error) {
      toast.error((error as Error).message ?? "Failed to update password");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-sm space-y-4 rounded-lg border border-border bg-surface-overlay p-6 text-center">
        <p className="text-sm text-muted-foreground">Preparing reset form…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mx-auto max-w-sm space-y-4 rounded-lg border border-border bg-surface-overlay p-6 text-center">
        <p className="text-sm text-destructive">Reset link is invalid or expired.</p>
        <a className="text-primary underline" href="/forgot-password">
          Request a new reset link
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm space-y-6 rounded-lg border border-border bg-surface-overlay p-6">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Set a new password</h1>
        <p className="text-sm text-muted-foreground">Enter a new password for your account.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            minLength={8}
            autoComplete="new-password"
            required
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">Must be at least 8 characters.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm new password</Label>
          <Input
            id="confirm-password"
            type="password"
            minLength={8}
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </div>
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Updating…" : "Update password"}
        </Button>
      </form>
    </div>
  );
}
