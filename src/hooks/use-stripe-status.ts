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
        const { message } = await response.json().catch(() => ({ message: "Stripe unavailable" }));
        throw new Error(message ?? "Stripe unavailable");
      }
      return (await response.json()) as StripeStatusResponse;
    },
    staleTime: 1000 * 60 * 5,
  });
}
