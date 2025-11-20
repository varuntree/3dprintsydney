import React from "react";
import { Document, Page, View, Text } from "@react-pdf/renderer";
import { styles, COLORS } from "./styles";
import {
  PdfHeader,
  PdfDocumentInfo,
  PdfAddressBlock,
  PdfLineItems,
  PdfTotalsBlock,
  PdfPaymentSection,
  PdfPaymentConfirmation,
  PdfReviewSection,
  PdfFooter,
} from "./components";
import { formatDate, formatCurrency } from "../templates/shared";
import type { InvoicePdfDocument } from "../types";

interface InvoiceDocumentProps {
  doc: InvoicePdfDocument;
  logoUrl?: string;
}

export const InvoiceDocument: React.FC<InvoiceDocumentProps> = ({ doc, logoUrl }) => {
  const isPaid = doc.document.status.toLowerCase() === "paid";

  const largeAmountText = isPaid
    ? `${formatCurrency(doc.totals.total)} PAID`
    : `${formatCurrency(doc.totals.balanceDue)} due ${
        doc.document.dueDate ? formatDate(doc.document.dueDate) : "immediately"
      }`;

  const footerReference = isPaid
    ? `${doc.document.number} • ${formatCurrency(doc.totals.total)} paid ${formatDate(
        doc.document.paidAt
      )}`
    : `${doc.document.number} • ${formatCurrency(doc.totals.balanceDue)} due ${
        doc.document.dueDate ? formatDate(doc.document.dueDate) : "immediately"
      }`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PdfHeader title="Invoice" logoUrl={logoUrl} />

        {isPaid && <Text style={styles.paidIndicator}>✓ PAID</Text>}

        <PdfDocumentInfo
          labels={[
            "Invoice Number",
            "Date Issued",
            isPaid ? "Paid Date" : "Payment Terms",
          ]}
          values={[
            doc.document.number,
            formatDate(doc.document.issueDate),
            isPaid
              ? formatDate(doc.document.paidAt)
              : doc.document.paymentTerms || "Due immediately",
          ]}
        />

        <PdfAddressBlock business={doc.business} client={doc.client} />

        <Text style={styles.largeAmount}>{largeAmountText}</Text>

        {isPaid ? (
          <View style={{ marginBottom: 20 }}>
            <Text style={styles.reviewText}>Thank you for your payment!</Text>
          </View>
        ) : (
          <PdfReviewSection />
        )}

        <PdfLineItems lines={doc.lines} />

        <View wrap={false}>
          <PdfTotalsBlock totals={doc.totals} isPaid={isPaid} />

          {isPaid && doc.document.paidAt ? (
            <PdfPaymentConfirmation paidAt={doc.document.paidAt} total={doc.totals.total} />
          ) : (
            <PdfPaymentSection
              bankDetails={doc.bankDetails}
              stripeCheckoutUrl={doc.stripeCheckoutUrl}
              invoiceNumber={doc.document.number}
              balanceDue={doc.totals.balanceDue}
            />
          )}
        </View>

        {doc.notes && doc.notes.trim().length > 0 && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Notes</Text>
            <Text style={styles.notesContent}>{doc.notes}</Text>
          </View>
        )}

        <PdfFooter terms={doc.terms} reference={footerReference} />
      </Page>
    </Document>
  );
};

