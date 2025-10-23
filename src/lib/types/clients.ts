/**
 * Client Types
 * All types related to the clients resource
 */

// Re-export Input types from schemas (Zod-validated)
export type { ClientInput, ClientNoteInput } from '@/lib/schemas/clients';

/**
 * Client Summary DTO
 * Used for list views with aggregated data
 */
export type ClientSummaryDTO = {
  id: number;
  name: string;
  company: string;
  email: string;
  phone: string;
  paymentTerms: string | null;
  notifyOnJobStatus: boolean;
  studentDiscountEligible: boolean;
  studentDiscountRate: number;
  outstandingBalance: number;
  totalInvoices: number;
  totalQuotes: number;
  walletBalance: number;
  createdAt: Date;
};

/**
 * Client Detail DTO
 * Full client details with related entities
 */
export type ClientDetailDTO = {
  client: {
    id: number;
    name: string;
    company: string;
    email: string;
    phone: string;
    address: string;
    paymentTerms: string;
    notifyOnJobStatus: boolean;
    abn: string | null;
    notes: string;
    tags: string[];
    walletBalance: number;
    createdAt: Date;
    updatedAt: Date;
    studentDiscountEligible: boolean;
    studentDiscountRate: number;
  };
  invoices: {
    id: number;
    number: string;
    status: string;
    total: number;
    balanceDue: number;
    issueDate: Date;
  }[];
  quotes: {
    id: number;
    number: string;
    status: string;
    total: number;
    issueDate: Date;
  }[];
  jobs: {
    id: number;
    title: string;
    status: string;
    priority: string;
    createdAt: Date;
  }[];
  activity: {
    id: number;
    action: string;
    message: string;
    createdAt: Date;
    context?: string;
  }[];
  totals: {
    outstanding: number;
    paid: number;
    queuedJobs: number;
  };
  clientUser?: {
    id: number;
    email: string;
    createdAt: Date;
    messageCount: number;
  } | null;
};

/**
 * Client Filters
 * Query parameters for listing clients
 */
export type ClientFilters = {
  q?: string;
  limit?: number;
  offset?: number;
  sort?: 'name' | 'createdAt';
  order?: 'asc' | 'desc';
};
