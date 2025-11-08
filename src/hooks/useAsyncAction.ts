"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { getUserMessage } from "@/lib/errors/user-messages";

interface UseAsyncActionOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  successMessage?: string;
  errorMessage?: string;
}

interface UseAsyncActionReturn {
  loading: boolean;
  error: Error | null;
  execute: (action: () => Promise<void>) => Promise<void>;
}

/**
 * useAsyncAction - Reusable hook for async form actions
 *
 * Provides loading state, error handling, and toast notifications
 * for async actions like form submissions.
 *
 * @example
 * ```tsx
 * function MyForm() {
 *   const { loading, execute } = useAsyncAction({
 *     successMessage: "Saved successfully!",
 *     errorMessage: "Failed to save"
 *   });
 *
 *   const handleSubmit = async () => {
 *     await execute(async () => {
 *       await fetch("/api/data", { method: "POST", body: ... });
 *     });
 *   };
 *
 *   return (
 *     <LoadingButton loading={loading} onClick={handleSubmit}>
 *       Submit
 *     </LoadingButton>
 *   );
 * }
 * ```
 */
export function useAsyncAction(options: UseAsyncActionOptions = {}): UseAsyncActionReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (action: () => Promise<void>) => {
      setLoading(true);
      setError(null);

      try {
        await action();

        if (options.successMessage) {
          toast.success(options.successMessage);
        }

        if (options.onSuccess) {
          options.onSuccess();
        }
      } catch (e) {
        const err = e as Error;
        setError(err);

        const toastMessage = options.errorMessage || getUserMessage(err);
        toast.error(toastMessage);

        if (options.onError) {
          options.onError(err);
        }
      } finally {
        setLoading(false);
      }
    },
    [options]
  );

  return { loading, error, execute };
}
