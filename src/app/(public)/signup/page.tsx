"use client";

import { useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, confirm }),
    });
    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Signup failed");
      return;
    }
    const { data } = await res.json();
    router.replace(data.role === "ADMIN" ? "/" : "/me");
  }

  return (
    <div className="mx-auto max-w-sm space-y-6 rounded-lg border border-border bg-surface-overlay p-6">
      <div>
        <h1 className="text-lg font-semibold">Create account</h1>
        <p className="text-sm text-muted-foreground">Sign up with email and password.</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Creating..." : "Create account"}
        </Button>
      </form>
      <div className="text-center text-sm">
        <a className="text-primary underline" href="/login">Already have an account? Sign in</a>
      </div>
    </div>
  );
}
