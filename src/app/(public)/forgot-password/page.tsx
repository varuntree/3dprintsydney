"use client";

import { useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json?.error ?? "Failed to send reset email");
        return;
      }
      toast.success("Check your email for reset instructions.");
      router.replace("/login");
    } catch (error) {
      toast.error((error as Error).message ?? "Failed to send reset email");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm space-y-6 rounded-lg border border-border bg-surface-overlay p-6">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Forgot password</h1>
        <p className="text-sm text-muted-foreground">
          Enter the email associated with your account and we&apos;ll send a reset link.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Sending…" : "Send reset link"}
        </Button>
      </form>
      <div className="text-center text-sm">
        <a className="text-primary underline" href="/login">
          Back to sign in
        </a>
      </div>
    </div>
  );
}
