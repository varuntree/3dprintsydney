"use client";

import { useState, type ChangeEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/projects/project-card";
import { ReorderButton } from "@/components/projects/reorder-button";
import type { ClientProjectSummary, ClientProjectListResponse } from "@/lib/types/dashboard";

const LIMIT = 50;

export function PrintAgainView() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<ClientProjectListResponse>({
    queryKey: ["client", "projects", "history", page, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        status: "completed",
        limit: String(LIMIT),
        offset: String((page - 1) * LIMIT),
        ...(search ? { q: search } : {}),
      });
      const res = await fetch(`/api/client/projects?${params}`);
      if (!res.ok) {
        throw new Error("Failed to load history");
      }
      const payload = await res.json();
      return payload.data as ClientProjectListResponse;
    },
  });

  if (isLoading) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Loading history...</div>;
  }

  if (!data || data.projects.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface-overlay px-8 py-12 text-center">
        <h3 className="text-lg font-semibold">No Completed Projects</h3>
        <p className="mt-2 text-sm text-muted-foreground">Historical projects will appear here once you finish them.</p>
      </div>
    );
  }

  const totalPages = Math.ceil(data.total / LIMIT) || 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Input
          placeholder="Search projects..."
          value={search}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
      </div>

      <div className="space-y-4">
        {data.projects.map((project: ClientProjectSummary) => (
          <div
            key={project.id}
            className="space-y-3 md:flex md:items-center md:justify-between md:gap-4"
          >
            <div className="flex-1">
              <ProjectCard project={project} />
            </div>
            <div className="md:self-start">
              <ReorderButton projectId={project.id} />
            </div>
          </div>
        ))}
      </div>

      {data.total > LIMIT && (
        <div className="flex items-center justify-center gap-3">
          <Button disabled={page === 1} onClick={() => setPage((value) => Math.max(value - 1, 1))} size="sm">
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            disabled={page >= totalPages}
            onClick={() => setPage((value) => Math.min(value + 1, totalPages))}
            size="sm"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
