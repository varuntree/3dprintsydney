"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "nextjs-toploader/app";
import { ArrowUpRight, Clock3, MessageSquare, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AnimatedCubeLogo } from "@/components/branding/animated-cube-logo";
import { cn } from "@/lib/utils";

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
        router.replace(data.role === "ADMIN" ? "/dashboard" : "/me");
      }
    });
  }, []);

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
      setError(
        typeof j?.error === "string"
          ? j.error
          : typeof j?.error?.message === "string"
          ? j.error.message
          : "Login failed",
      );
      return;
    }
    const { data } = await res.json();
    router.replace(data.role === "ADMIN" ? "/dashboard" : "/me");
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-surface-overlay/85 shadow-xl shadow-black/10 backdrop-blur supports-[backdrop-filter]:bg-surface-overlay/65">
      <div
        className="pointer-events-none absolute -left-24 top-24 hidden h-64 w-64 rounded-full bg-primary/20 blur-3xl sm:block"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-20 bottom-16 hidden h-72 w-72 rounded-full bg-[radial-gradient(circle_at_top,rgba(205,255,0,0.28),transparent)] blur-3xl sm:block"
        aria-hidden="true"
      />

      <div className="relative grid overflow-hidden rounded-[inherit] sm:grid-cols-[1.05fr_0.95fr]">
        <div className="relative order-2 space-y-10 border-b border-border/60 bg-gradient-to-br from-surface-subtle/95 via-surface-subtle/75 to-surface-overlay/40 p-6 sm:order-1 sm:border-b-0 sm:border-r sm:p-10">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-3 text-sm font-semibold text-foreground">
              <AnimatedCubeLogo className="h-10 w-10" />
              <span className="tracking-tight">3D Print Sydney</span>
            </div>
            <span className="hidden text-xs font-medium text-foreground/60 sm:inline-flex">Sydney · AEST</span>
          </div>

          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.3em] text-foreground/55">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
              Portal access
            </span>
            <h1 className="text-3xl font-semibold leading-tight text-foreground sm:text-4xl">Welcome back</h1>
            <p className="text-sm text-foreground/70 sm:text-base">
              Sign in to manage quotes, monitor print progress, and collaborate with our engineering team.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {highlights.map(({ icon: Icon, title, description }, index) => (
              <div
                key={title}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border border-border/60 bg-white/75 p-4 shadow-sm shadow-black/5 transition hover:border-foreground/40",
                  index === highlights.length - 1 ? "sm:col-span-2" : undefined,
                )}
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-lime-200/30 opacity-0 transition group-hover:opacity-100"
                />
                <div className="relative flex items-start gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/60 bg-white text-foreground">
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  </span>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">{title}</p>
                    <p className="text-xs text-foreground/60 sm:text-sm">{description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-foreground/70">
            <span className="hidden sm:inline">Same-day production available</span>
          </div>
        </div>

        <div className="relative order-1 space-y-8 bg-surface-overlay/90 p-6 sm:order-2 sm:p-10">
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-foreground/55">Sign in</span>
            <h2 className="text-2xl font-semibold text-foreground">Access your workspace</h2>
            <p className="text-sm text-foreground/60">
              Use the email and password associated with your 3D Print Sydney account.
            </p>
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
          </div>
        </div>
      </div>
    </div>
  );
}
