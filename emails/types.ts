export interface QuoteSentEmailProps {
  clientName: string;
  quoteNumber: string;
  businessName: string;
  viewUrl: string;
  customMessage: string;
}

export interface InvoiceCreatedEmailProps {
  clientName: string;
  invoiceNumber: string;
  businessName: string;
  total: string;
  dueDate: string;
  viewUrl: string;
  customMessage: string;
}

export interface PaymentConfirmationEmailProps {
  clientName: string;
  invoiceNumber: string;
  businessName: string;
  amount: string;
  paymentMethod: string;
  customMessage: string;
}

export interface JobStatusUpdateEmailProps {
  clientName: string;
  jobNumber: string;
  businessName: string;
  status: string;
  statusMessage: string;
  customMessage: string;
}

export interface WelcomeEmailProps {
  firstName: string;
  businessName: string;
  loginUrl: string;
  customMessage: string;
}

export interface QuoteAcceptedEmailProps {
  quoteNumber: string;
  clientName: string;
  businessName: string;
  viewUrl: string;
  customMessage: string;
}

export interface QuoteDeclinedEmailProps {
  quoteNumber: string;
  clientName: string;
  businessName: string;
  viewUrl: string;
  customMessage: string;
}
