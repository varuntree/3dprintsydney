import React from "react";
import { Document, Page, View, Text } from "@react-pdf/renderer";
import { styles } from "./styles";
import {
  PdfHeader,
  PdfDocumentInfo,
  PdfAddressBlock,
  PdfLineItems,
  PdfTotalsBlock,
  PdfFooter,
} from "./components";
import { formatDate, formatCurrency } from "../templates/shared";
import type { QuotePdfDocument } from "../types";

interface QuoteDocumentProps {
  doc: QuotePdfDocument;
  logoUrl?: string;
}

export const QuoteDocument: React.FC<QuoteDocumentProps> = ({ doc, logoUrl }) => {
  const largeAmountText = doc.document.validUntil
    ? `${formatCurrency(doc.totals.total)} valid until ${formatDate(doc.document.validUntil)}`
    : formatCurrency(doc.totals.total);

  const footerReference = doc.document.validUntil
    ? `${doc.document.number} • quote expires ${formatDate(doc.document.validUntil)}`
    : doc.document.number;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PdfHeader title="Quote" logoUrl={logoUrl} />

        <PdfDocumentInfo
          labels={["Quote Number", "Date Issued", "Valid Until"]}
          values={[
            doc.document.number,
            formatDate(doc.document.issueDate),
            doc.document.validUntil ? formatDate(doc.document.validUntil) : "N/A",
          ]}
        />

        <PdfAddressBlock business={doc.business} client={doc.client} isQuote />

        <Text style={styles.largeAmount}>{largeAmountText}</Text>

        <PdfLineItems lines={doc.lines} />

        <PdfTotalsBlock totals={doc.totals} isPaid={false} />

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

