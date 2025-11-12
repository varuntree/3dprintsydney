"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ProjectCard } from "@/components/projects/project-card";
import { toast } from "sonner";
import type { ClientProjectSummary } from "@/lib/types/dashboard";

const LIMIT = 50;

export function CompletedProjectsView() {
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["client", "projects", "completed", page],
    queryFn: async () => {
      const params = new URLSearchParams({
        status: "completed",
        limit: String(LIMIT),
        offset: String((page - 1) * LIMIT),
      });
      const res = await fetch(`/api/client/projects?${params}`);
      if (!res.ok) {
        throw new Error("Failed to load completed projects");
      }
      const payload = await res.json();
      return payload.data;
    },
    keepPreviousData: true,
  });

  useEffect(() => {
    setSelectedIds([]);
  }, [data?.projects]);

  const allIds = data?.projects.map((project: ClientProjectSummary) => project.id) ?? [];
  const allSelected = allIds.length > 0 && selectedIds.length === allIds.length;

  const archiveMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const res = await fetch("/api/projects/archive", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids, action: "archive" }),
      });
      if (!res.ok) {
        throw new Error("Failed to archive projects");
      }
      return res.json();
    },
    onSuccess: (payload) => {
      const count = payload.data?.count ?? 0;
      toast.success(`${count} project${count === 1 ? "" : "s"} archived`);
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["client", "projects"] });
    },
    onError: () => {
      toast.error("Failed to archive projects");
    },
  });

  const handleArchive = async () => {
    if (selectedIds.length === 0) return;
    const confirmed = window.confirm(`Archive ${selectedIds.length} project${selectedIds.length === 1 ? "" : "s"}?`);
    if (!confirmed) return;
    await archiveMutation.mutateAsync(selectedIds);
  };

  const totalPages = data ? Math.ceil(data.total / LIMIT) || 1 : 1;

  if (isLoading && !data) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Loading completed projects...</div>;
  }

  if (!data?.projects?.length) {
    return (
      <div className="rounded-2xl border border-border bg-surface-overlay px-8 py-12 text-center">
        <h3 className="text-lg font-semibold">No completed projects</h3>
        <p className="mt-2 text-sm text-muted-foreground">Once a project finishes, it will show up here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={allSelected}
            onCheckedChange={() => setSelectedIds(allSelected ? [] : [...allIds])}
          />
          <div className="text-sm font-semibold">Select all</div>
        </div>
        <Button size="sm" onClick={handleArchive} disabled={selectedIds.length === 0 || archiveMutation.isPending}>
          Archive Selected
        </Button>
      </div>

      <div className="space-y-3">
        {data.projects.map((project: ClientProjectSummary) => (
          <div key={project.id} className="flex gap-3">
            <div>
              <Checkbox
                checked={selectedIds.includes(project.id)}
                onCheckedChange={(checked) => {
                  const isChecked = checked === true;
                  setSelectedIds((prev) =>
                    isChecked ? [...prev, project.id] : prev.filter((id) => id !== project.id),
                  );
                }}
              />
            </div>
            <div className="flex-1">
              <ProjectCard project={project} />
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
