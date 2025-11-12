export const invoiceLineTypes = ["PRINT", "MODELLING"] as const;
export type InvoiceLineType = (typeof invoiceLineTypes)[number];

export const modellingComplexityValues = ["SIMPLE", "MODERATE", "COMPLEX"] as const;
export type ModellingComplexity = (typeof modellingComplexityValues)[number];
