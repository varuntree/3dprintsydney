export const QuoteStatus = {
  DRAFT: 'DRAFT',
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  DECLINED: 'DECLINED',
  CONVERTED: 'CONVERTED',
} as const;
export type QuoteStatus = (typeof QuoteStatus)[keyof typeof QuoteStatus];

export const InvoiceStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
} as const;
export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

export const DiscountType = {
  NONE: 'NONE',
  PERCENT: 'PERCENT',
  FIXED: 'FIXED',
} as const;
export type DiscountType = (typeof DiscountType)[keyof typeof DiscountType];

export const PricingType = {
  FIXED: 'FIXED',
  CALCULATED: 'CALCULATED',
} as const;
export type PricingType = (typeof PricingType)[keyof typeof PricingType];

export const PaymentMethod = {
  STRIPE: 'STRIPE',
  BANK_TRANSFER: 'BANK_TRANSFER',
  CASH: 'CASH',
  OTHER: 'OTHER',
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const JobStatus = {
  QUEUED: 'QUEUED',
  PRE_PROCESSING: 'PRE_PROCESSING',
  IN_QUEUE: 'IN_QUEUE',
  PRINTING: 'PRINTING',
  PAUSED: 'PAUSED',
  PRINTING_COMPLETE: 'PRINTING_COMPLETE',
  POST_PROCESSING: 'POST_PROCESSING',
  PACKAGING: 'PACKAGING',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

export const JobPriority = {
  NORMAL: 'NORMAL',
  FAST_TRACK: 'FAST_TRACK',
  URGENT: 'URGENT',
} as const;
export type JobPriority = (typeof JobPriority)[keyof typeof JobPriority];

export const PrinterStatus = {
  ACTIVE: 'ACTIVE',
  MAINTENANCE: 'MAINTENANCE',
  OFFLINE: 'OFFLINE',
} as const;
export type PrinterStatus = (typeof PrinterStatus)[keyof typeof PrinterStatus];

export const JobCreationPolicy = {
  ON_PAYMENT: 'ON_PAYMENT',
  ON_INVOICE: 'ON_INVOICE',
} as const;
export type JobCreationPolicy = (typeof JobCreationPolicy)[keyof typeof JobCreationPolicy];

export const Role = {
  ADMIN: 'ADMIN',
  CLIENT: 'CLIENT',
} as const;
export type Role = (typeof Role)[keyof typeof Role];
