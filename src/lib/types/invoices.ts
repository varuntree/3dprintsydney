/**
 * Invoice Types
 * All types related to the invoices resource
 */

import type { InvoiceStatus, DiscountType, PaymentMethod, JobStatus } from '@/lib/constants/enums';

// Re-export Input types from schemas (Zod-validated)
export type { InvoiceInput, InvoiceLineInput, PaymentInput } from '@/lib/schemas/invoices';

/**
 * Invoice Line DTO
 * Represents a single line item in an invoice
 */
export type InvoiceLineDTO = {
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
 * Payment DTO
 * Represents a payment made on an invoice
 */
export type PaymentDTO = {
  id: number;
  amount: number;
  method: PaymentMethod;
  reference: string;
  processor: string;
  processorId: string;
  notes: string;
  paidAt: Date;
};

/**
 * Invoice Attachment DTO
 * Represents a file attached to an invoice
 */
export type InvoiceAttachmentDTO = {
  id: number;
  filename: string;
  filetype: string | null;
  size: number;
  storageKey: string;
  uploadedAt: Date;
};

/**
 * Invoice Job DTO
 * Represents a job linked to an invoice
 */
export type InvoiceJobDTO = {
  id: number;
  title: string;
  status: JobStatus;
  printerId: number | null;
  printerName: string | null;
  notes: string;
  updatedAt: Date;
};

/**
 * Payment Term DTO
 * Resolved payment term configuration
 */
export type PaymentTermDTO = {
  code: string;
  label: string;
  days: number;
  source?: 'client' | 'default';
};

/**
 * Invoice Detail DTO
 * Full invoice details with related entities
 */
export type InvoiceDetailDTO = {
  id: number;
  number: string;
  status: InvoiceStatus;
  total: number;
  balanceDue: number;
  issueDate: Date;
  dueDate: Date | null;
  notes: string;
  terms: string;
  taxRate?: number;
  shippingCost: number;
  shippingLabel: string;
  subtotal: number;
  taxTotal: number;
  discountType: DiscountType;
  discountValue: number;
  poNumber: string;
  internalNotes: string;
  calculatorSnapshot: unknown | null;
  paidAt: Date | null;
  stripeCheckoutUrl: string | null;
  client: {
    id: number;
    name: string;
  };
  paymentTerms: PaymentTermDTO | null;
  attachments: InvoiceAttachmentDTO[];
  lines: InvoiceLineDTO[];
  payments: PaymentDTO[];
  jobs: InvoiceJobDTO[];
};

/**
 * Invoice Summary DTO
 * Used for list views with minimal data
 */
export type InvoiceSummaryDTO = {
  id: number;
  number: string;
  clientName: string;
  status: InvoiceStatus;
  total: number;
  balanceDue: number;
  issueDate: Date;
  dueDate: Date | null;
  hasStripeLink: boolean;
};

/**
 * Invoice Filters
 * Query parameters for listing invoices
 */
export type InvoiceFilters = {
  q?: string;
  statuses?: ('PENDING' | 'PAID' | 'OVERDUE')[];
  limit?: number;
  offset?: number;
  sort?: 'issueDate' | 'dueDate' | 'createdAt' | 'number';
  order?: 'asc' | 'desc';
};

/**
 * Client Invoice DTO
 * Used for client portal invoice list
 */
export type ClientInvoiceDTO = {
  id: number;
  number: string;
  status: InvoiceStatus;
  total: number;
  issueDate: string;
  balanceDue: number;
  stripeCheckoutUrl: string | null;
};

/**
 * Activity Log DTO
 * Represents an activity log entry
 */
export type ActivityDTO = {
  id: number;
  action: string;
  message: string;
  createdAt: string;
};
