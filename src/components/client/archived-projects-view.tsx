"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/projects/project-card";
import { toast } from "sonner";
import type { ClientProjectSummary } from "@/lib/types/dashboard";

const LIMIT = 50;

export function ArchivedProjectsView() {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["client", "projects", "archived", page],
    queryFn: async () => {
      const params = new URLSearchParams({
        status: "archived",
        limit: String(LIMIT),
        offset: String((page - 1) * LIMIT),
      });
      const res = await fetch(`/api/client/projects?${params}`);
      if (!res.ok) {
        throw new Error("Failed to load archived projects");
      }
      const payload = await res.json();
      return payload.data;
    },
    keepPreviousData: true,
  });

  const unarchiveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch("/api/projects/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id], action: "unarchive" }),
      });
      if (!res.ok) {
        throw new Error("Failed to unarchive project");
      }
      return res.json();
    },
    onSuccess: (payload) => {
      const count = payload.data?.count ?? 0;
      toast.success(`${count} project${count === 1 ? "" : "s"} restored`);
      queryClient.invalidateQueries({ queryKey: ["client", "projects"] });
    },
    onError: () => {
      toast.error("Failed to unarchive project");
    },
  });

  const totalPages = data ? Math.ceil(data.total / LIMIT) || 1 : 1;

  if (isLoading && !data) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Loading archived projects...</div>;
  }

  if (!data?.projects?.length) {
    return (
      <div className="rounded-2xl border border-border bg-surface-overlay px-8 py-12 text-center">
        <h3 className="text-lg font-semibold">No archived projects</h3>
        <p className="mt-2 text-sm text-muted-foreground">Archived projects will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {data.projects.map((project: ClientProjectSummary) => (
          <div key={project.id} className="space-y-3 md:flex md:items-center md:justify-between md:gap-4">
            <div className="flex-1">
              <ProjectCard project={project} />
            </div>
            <div className="md:self-start">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => unarchiveMutation.mutate(project.id)}
                disabled={unarchiveMutation.isPending}
              >
                Unarchive
              </Button>
            </div>
          </div>
        ))}
      </div>

      {data.total > LIMIT && (
        <div className="flex items-center justify-center gap-3">
          <Button disabled={page === 1} size="sm" onClick={() => setPage((value) => Math.max(value - 1, 1))}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button disabled={page >= totalPages} size="sm" onClick={() => setPage((value) => Math.min(value + 1, totalPages))}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
