"use client";

import { useQuery } from "@tanstack/react-query";
import { getJson } from "@/lib/http";
import {
  DEFAULT_PAYMENT_TERMS,
  type SettingsInput,
} from "@/lib/schemas/settings";
import type { SettingsPayload } from "@/components/settings/settings-form";

type PaymentTermOption = SettingsInput["paymentTerms"][number];

interface UsePaymentTermsResult {
  terms: PaymentTermOption[];
  defaultTermCode: string;
  isLoading: boolean;
}

const queryKey = ["settings"] as const;

export function usePaymentTerms(): UsePaymentTermsResult {
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => getJson<SettingsPayload>("/api/settings"),
    staleTime: 1000 * 60,
  });

  const terms = data?.paymentTerms?.length
    ? data.paymentTerms
    : DEFAULT_PAYMENT_TERMS.map((term) => ({ ...term }));

  const defaultTermCode = terms.some((term) => term.code === data?.defaultPaymentTerms)
    ? data?.defaultPaymentTerms ?? terms[0]?.code ?? ""
    : terms[0]?.code ?? "";

  return {
    terms,
    defaultTermCode,
    isLoading,
  };
}

export function findPaymentTermLabel(
  terms: PaymentTermOption[],
  code?: string | null,
): PaymentTermOption | undefined {
  if (!code) return undefined;
  return terms.find((term) => term.code === code);
}
