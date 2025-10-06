"use client";

import { useIsMutating } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

/**
 * MutationLoader - Global mutation loading indicator
 *
 * Shows a floating spinner in the bottom-right corner when any
 * React Query mutation is in progress.
 *
 * Usage:
 * Add this component to your shell layouts (AdminShell, ClientShell)
 * and it will automatically show when mutations are running.
 *
 * @example
 * ```tsx
 * // In AdminShell or ClientShell
 * <div>
 *   {children}
 *   <MutationLoader />
 * </div>
 * ```
 */
export function MutationLoader() {
  const isMutating = useIsMutating();

  if (!isMutating) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-blue-500 px-4 py-3 text-white shadow-lg"
      role="status"
      aria-live="polite"
      aria-label="Saving changes"
    >
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
      <span className="text-sm font-medium">Saving...</span>
    </div>
  );
}
