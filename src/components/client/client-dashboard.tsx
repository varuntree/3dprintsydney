"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

const ACTIONS: Array<{ label: string; href: string; variant: "default" | "outline" }> = [
  { label: "New Project", href: "/quick-order", variant: "default" },
  { label: "Active Projects", href: "/client/projects/active", variant: "outline" },
  { label: "Print Again", href: "/client/projects/history", variant: "outline" },
];

export function ClientDashboard() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Welcome back, let’s print.</h1>
        <p className="text-sm text-muted-foreground">
          Your workspace now centers on projects—launch a new print or jump straight back into one you
          previously started.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {ACTIONS.map((action) => (
          <Button
            key={action.href}
            asChild
            variant={action.variant}
            size="lg"
            className="h-16 rounded-2xl px-4 text-base font-semibold uppercase tracking-wide transition hover:-translate-y-0.5"
          >
            <Link
              href={action.href}
              className="flex h-full w-full items-center justify-center leading-tight"
            >
              {action.label}
            </Link>
          </Button>
        ))}
      </div>
    </div>
  );
}
