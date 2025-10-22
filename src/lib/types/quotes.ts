/**
 * Quote Types
 * All types related to the quotes resource
 */

import type { QuoteStatus, DiscountType } from '@/lib/constants/enums';
import type { PaymentTermDTO } from './invoices';

// Re-export Input types from schemas (Zod-validated)
export type { QuoteInput, QuoteLineInput, DiscountTypeValue } from '@/lib/schemas/quotes';

/**
 * Quote Line DTO
 * Represents a single line item in a quote
 */
export type QuoteLineDTO = {
  id: number;
  productTemplateId?: number;
  name: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discountType: DiscountType;
  discountValue: number;
  total: number;
  orderIndex: number;
  calculatorBreakdown: Record<string, unknown> | null;
};

/**
 * Quote Detail DTO
 * Full quote details with related entities
 */
export type QuoteDetailDTO = {
  id: number;
  number: string;
  client: {
    id: number;
    name: string;
    company?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  };
  status: QuoteStatus;
  paymentTerms: (PaymentTermDTO & { source: 'client' | 'default' }) | null;
  issueDate: Date;
  expiryDate: Date | null;
  taxRate: number;
  discountType: DiscountType;
  discountValue: number;
  shippingCost: number;
  shippingLabel: string;
  notes: string;
  terms: string;
  subtotal: number;
  total: number;
  taxTotal: number;
  lines: QuoteLineDTO[];
  sentAt: Date | null;
  acceptedAt: Date | null;
  declinedAt: Date | null;
  decisionNote: string | null;
  convertedInvoiceId: number | null;
};

/**
 * Quote Summary DTO
 * Used for list views with minimal data
 */
export type QuoteSummaryDTO = {
  id: number;
  number: string;
  clientName: string;
  status: QuoteStatus;
  total: number;
  issueDate: Date;
  expiryDate: Date | null;
};

/**
 * Quote Filters
 * Query parameters for listing quotes
 */
export type QuoteFilters = {
  q?: string;
  statuses?: ('DRAFT' | 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CONVERTED')[];
  limit?: number;
  offset?: number;
  sort?: 'issueDate' | 'createdAt' | 'number';
  order?: 'asc' | 'desc';
};
