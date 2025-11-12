"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function ReorderButton({ projectId }: { projectId: number }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/reorder`, {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error("Reorder failed");
      }
      return res.json();
    },
    onSuccess: (payload) => {
      const quoteId = payload.data?.quoteId;
      toast.success("Project reordered! Redirecting to quote...");
      queryClient.invalidateQueries({ queryKey: ["client", "projects"] });
      if (quoteId) {
        router.push(`/quotes/${quoteId}`);
      }
    },
    onError: () => {
      toast.error("Failed to reorder project");
    },
  });

  return (
    <Button size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
      {mutation.isPending ? "Reordering..." : "Print Again"}
    </Button>
  );
}
