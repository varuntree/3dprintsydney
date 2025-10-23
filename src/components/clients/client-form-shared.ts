"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver } from "react-hook-form";
import { clientInputSchema } from "@/lib/schemas/clients";

export type ClientFormValues = {
  name: string;
  company?: string;
  abn?: string;
  email?: string;
  phone?: string;
  address?: string;
  paymentTerms?: string;
  notes?: string;
  tags?: string[];
  notifyOnJobStatus?: boolean;
};

export const PAYMENT_TERMS_INHERIT_VALUE = "__inherit_payment_terms__";

export const clientFormResolver = zodResolver(
  clientInputSchema,
) as Resolver<ClientFormValues>;

export function defaultClientFormValues(): ClientFormValues {
  return {
    name: "",
    company: "",
    abn: "",
    email: "",
    phone: "",
    address: "",
    paymentTerms: "",
    notes: "",
    tags: [],
    notifyOnJobStatus: false,
  };
}
