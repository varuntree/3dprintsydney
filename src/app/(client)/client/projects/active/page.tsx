"use client";

import { ActiveProjectsView } from "@/components/client/active-projects-view";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export default function ActiveProjectsPage() {
  return (
    <div className="space-y-6 pb-6">
      <div className="space-y-3">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/client" },
            { label: "Active Projects" },
          ]}
        />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Active Projects</h1>
          <p className="text-sm text-muted-foreground">
            Monitor work that is still in progress and quickly jump to the associated invoice.
          </p>
        </div>
      </div>
      <ActiveProjectsView />
    </div>
  );
}
