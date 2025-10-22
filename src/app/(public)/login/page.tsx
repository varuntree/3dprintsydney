"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "nextjs-toploader/app";
import { ArrowUpRight, Box, Clock3, MessageSquare, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const highlights = [
  {
    icon: Clock3,
    title: "Real-time production visibility",
    description: "Track print status, approvals, and delivery milestones at a glance.",
  },
  {
    icon: ShieldCheck,
    title: "Secure file handover",
    description: "Upload revisions safely with version history that stays synced with our engineers.",
  },
  {
    icon: MessageSquare,
    title: "Direct engineer collaboration",
    description: "Ask questions, share context, and keep conversations tied to each order.",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then(async (r) => {
      if (r.ok) {
        const { data } = await r.json();
        router.replace(data.role === "ADMIN" ? "/" : "/me");
      }
    });
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Login failed");
      return;
    }
    const { data } = await res.json();
    router.replace(data.role === "ADMIN" ? "/" : "/me");
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-border/70 bg-surface-overlay/80 shadow-lg shadow-black/5 backdrop-blur supports-[backdrop-filter]:bg-surface-overlay/60">
      <div className="grid gap-6 sm:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-8 border-b border-border/60 bg-surface-subtle/70 p-6 sm:border-b-0 sm:border-r sm:p-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-foreground transition hover:text-foreground/80"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-white shadow-xs">
              <Box className="h-4 w-4" aria-hidden />
            </span>
            3D Print Sydney
          </Link>

          <div className="space-y-3">
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-foreground/50">Portal access</span>
            <h1 className="text-3xl font-semibold leading-tight text-foreground sm:text-4xl">Welcome back</h1>
            <p className="text-sm text-foreground/70 sm:text-base">
              Sign in to manage quotes, monitor print progress, and collaborate with our engineering team.
            </p>
          </div>

          <div className="space-y-3">
            {highlights.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="group flex items-start gap-3 rounded-2xl border border-border/60 bg-white/40 p-3 shadow-sm shadow-black/5 transition hover:border-foreground/40 sm:p-4"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-white text-foreground">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">{title}</p>
                  <p className="text-xs text-foreground/60 sm:text-sm">{description}</p>
                </div>
              </div>
            ))}
          </div>

          <Link
            href="/quick-order"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:text-primary/80"
          >
            Need a quote instead?
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        <div className="space-y-6 p-6 sm:p-10">
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-foreground/50">Sign in</span>
            <h2 className="text-2xl font-semibold text-foreground">Access your workspace</h2>
            <p className="text-sm text-foreground/60">Use the email and password associated with your 3D Print Sydney account.</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-3">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error ? (
              <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={loading} className="w-full rounded-full" aria-busy={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-foreground/70">
            <Link
              href="/signup"
              className="inline-flex items-center gap-1 font-medium text-primary transition hover:text-primary/80"
            >
              Create an account
            </Link>
            <Link
              href="/forgot-password"
              className="inline-flex items-center gap-1 font-medium text-primary transition hover:text-primary/80"
            >
              Forgot password?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
