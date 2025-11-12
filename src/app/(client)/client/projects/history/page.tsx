"use client";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PrintAgainView } from "@/components/client/print-again-view";

export default function PrintAgainPage() {
  return (
    <div className="space-y-6 pb-6">
      <div className="space-y-3">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/client" },
            { label: "Print Again" },
          ]}
        />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Print Again</h1>
          <p className="text-sm text-muted-foreground">
            Replicate past paid projects with one click and keep your workflow moving forward.
          </p>
        </div>
      </div>
      <PrintAgainView />
    </div>
  );
}
