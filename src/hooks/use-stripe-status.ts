"use client";

import { useQuery } from "@tanstack/react-query";

interface StripeStatusResponse {
  ok: boolean;
}

export function useStripeStatus() {
  return useQuery<StripeStatusResponse, Error>({
    queryKey: ["stripe-status"],
    queryFn: async () => {
      const response = await fetch("/api/stripe/test", { method: "POST" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: { message: "Stripe unavailable" } }));
        const error = body?.error ?? { message: "Stripe unavailable" };
        throw new Error(error.message ?? "Stripe unavailable");
      }
      const body = await response.json();
      return body.data as StripeStatusResponse;
    },
    staleTime: 1000 * 60 * 5,
  });
}
