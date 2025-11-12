"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/projects/project-card";
import { ClientProjectStatus } from "@/lib/constants/client-project-status";
import type { ClientProjectSummary } from "@/lib/types/dashboard";

const FILTERS: (ClientProjectStatus | "ALL")[] = [
  "ALL",
  ClientProjectStatus.PENDING_PRINT,
  ClientProjectStatus.PENDING_PAYMENT,
];

export function ActiveProjectsView() {
  const [filter, setFilter] = useState<ClientProjectStatus | "ALL">("ALL");

  const { data, isLoading } = useQuery<ClientProjectSummary[]>({
    queryKey: ["client", "projects", "active"],
    queryFn: async () => {
      const res = await fetch("/api/client/projects?status=active");
      if (!res.ok) {
        throw new Error("Failed to load active projects");
      }
      const payload = await res.json();
      return payload.data.projects;
    },
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    if (filter === "ALL") return data;
    return data.filter((project) => project.clientStatus === filter);
  }, [data, filter]);

  if (isLoading) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Loading active projects...</div>;
  }

  if (!data?.length) {
    return (
      <div className="rounded-2xl border border-border bg-surface-overlay px-8 py-12 text-center">
        <h3 className="text-lg font-semibold">No Active Projects</h3>
        <p className="mt-2 text-sm text-muted-foreground">Start a new project to see it here.</p>
        <Button asChild className="mt-6">
          <Link href="/quick-order">Create a project</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={filter} onValueChange={(value) => setFilter(value as ClientProjectStatus | "ALL")}> 
        <TabsList className="gap-3">
          {FILTERS.map((value) => (
            <TabsTrigger key={value} value={value} className="w-auto px-4">
              {value === "ALL"
                ? `All (${data.length})`
                : value === ClientProjectStatus.PENDING_PRINT
                ? `Pending Print (${data.filter((project) => project.clientStatus === ClientProjectStatus.PENDING_PRINT).length})`
                : `Pending Payment (${data.filter((project) => project.clientStatus === ClientProjectStatus.PENDING_PAYMENT).length})`}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="space-y-4">
        {filtered.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}
