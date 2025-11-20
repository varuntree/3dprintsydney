import React from "react";
import { Text, View, Image, Link } from "@react-pdf/renderer";
import { styles, COLORS } from "./styles";
import {
  formatDate,
  formatCurrency,
  discountLabel,
  parseCalculatorBreakdown,
  REVIEW_URL,
} from "../templates/shared";
import type { PdfBusinessInfo, PdfClientInfo, PdfLineItem, PdfTotals } from "../types";

// --- Header ---
interface PdfHeaderProps {
  title: string;
  logoUrl?: string; // Can be a URL or Data URI
}

export const PdfHeader: React.FC<PdfHeaderProps> = ({ title, logoUrl }) => {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      {/* Use absolute URL for logo if running in browser, or passed prop */}
      {logoUrl ? <Image style={styles.logo} src={logoUrl} /> : null}
    </View>
  );
};

// --- Document Info ---
interface PdfDocumentInfoProps {
  labels: string[];
  values: string[];
}

export const PdfDocumentInfo: React.FC<PdfDocumentInfoProps> = ({ labels, values }) => {
  return (
    <View style={styles.docInfoTable}>
      {labels.map((label, i) => (
        <View key={i} style={styles.docInfoCol}>
          <Text style={styles.docInfoLabel}>{label}</Text>
          <Text style={styles.docInfoValue}>{values[i]}</Text>
        </View>
      ))}
    </View>
  );
};

// --- Address Block ---
interface PdfAddressBlockProps {
  business: PdfBusinessInfo;
  client: PdfClientInfo;
  isQuote?: boolean;
}

export const PdfAddressBlock: React.FC<PdfAddressBlockProps> = ({
  business,
  client,
  isQuote = false,
}) => {
  return (
    <View style={styles.infoSection}>
      <View style={styles.infoBlock}>
        <Text style={styles.itemTitle}>{business.name}</Text>
        <Text style={styles.infoText}>{business.address}</Text>
        <Text style={styles.infoText}>{business.phone}</Text>
        <Text style={styles.infoText}>{business.email}</Text>
        {business.abn && <Text style={styles.infoText}>ABN: {business.abn}</Text>}
      </View>

      <View style={styles.infoBlock}>
        <Text style={styles.infoLabel}>{isQuote ? "Quote for:" : "Bill to:"}</Text>
        <Text style={styles.itemTitle}>{client.name}</Text>
        {client.email && <Text style={styles.infoText}>{client.email}</Text>}
        {client.phone && <Text style={styles.infoText}>{client.phone}</Text>}
        {client.address && <Text style={styles.infoText}>{client.address}</Text>}
      </View>
    </View>
  );
};

// --- Line Items ---
interface PdfLineItemsProps {
  lines: PdfLineItem[];
}

export const PdfLineItems: React.FC<PdfLineItemsProps> = ({ lines }) => {
  const hasDiscounts = lines.some((line) => line.discountValue && line.discountValue > 0);

  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={[styles.th, hasDiscounts ? styles.colDescWide : styles.colDesc]}>
          Description
        </Text>
        <Text style={[styles.th, hasDiscounts ? styles.colQtySmall : styles.colQty]}>Qty</Text>
        
        {hasDiscounts && (
           <Text style={[styles.th, styles.colPriceSmall]}>Orig. Price</Text>
        )}
        {hasDiscounts && (
           <Text style={[styles.th, styles.colDiscount]}>Discount</Text>
        )}

        <Text style={[styles.th, hasDiscounts ? styles.colDiscPrice : styles.colPrice]}>
          {hasDiscounts ? "Disc. Price" : "Unit Price"}
        </Text>
        <Text style={[styles.th, hasDiscounts ? styles.colTotalSmall : styles.colTotal]}>
          Total
        </Text>
      </View>

      {lines.map((line, index) => {
        const breakdown = parseCalculatorBreakdown(line.description);
        const origPrice = line.discountValue
          ? line.unitPrice +
            (line.discountType === "percentage"
              ? line.unitPrice * (line.discountValue / 100)
              : line.discountValue / line.quantity)
          : line.unitPrice;

        return (
          <View key={index} style={styles.tableRow}>
            <View style={hasDiscounts ? styles.colDescWide : styles.colDesc}>
              <Text style={styles.itemTitle}>{line.name}</Text>
              {breakdown.length > 0 ? (
                breakdown.map((b, i) => (
                  <Text key={i} style={styles.itemDesc}>
                    • {b}
                  </Text>
                ))
              ) : line.description ? (
                <Text style={styles.itemDesc}>{line.description}</Text>
              ) : null}
            </View>

            <Text style={[styles.td, hasDiscounts ? styles.colQtySmall : styles.colQty]}>
              {line.quantity} {line.unit}
            </Text>

            {hasDiscounts && (
              <Text style={[styles.td, styles.colPriceSmall]}>
                {formatCurrency(origPrice)}
              </Text>
            )}

            {hasDiscounts && (
              <Text style={[styles.td, styles.colDiscount]}>
                {discountLabel(line.discountType, line.discountValue)}
              </Text>
            )}

            <Text style={[styles.td, hasDiscounts ? styles.colDiscPrice : styles.colPrice]}>
              {formatCurrency(line.unitPrice)}
            </Text>
            
            <Text style={[styles.td, hasDiscounts ? styles.colTotalSmall : styles.colTotal]}>
              {formatCurrency(line.total)}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

// --- Totals ---
interface PdfTotalsProps {
  totals: PdfTotals & { balanceDue?: number };
  isPaid?: boolean;
}

export const PdfTotalsBlock: React.FC<PdfTotalsProps> = ({ totals, isPaid }) => {
  return (
    <View style={styles.totalsSection} wrap={false}>
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Subtotal</Text>
        <Text style={styles.totalValue}>{formatCurrency(totals.subtotal)}</Text>
      </View>

      {totals.discountValue && totals.discountValue > 0 && (
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>
            Discount ({discountLabel(totals.discountType, totals.discountValue)})
          </Text>
          <Text style={styles.totalValue}>
            -{formatCurrency(
              totals.discountType === "percentage"
                ? (totals.subtotal * totals.discountValue) / 100
                : totals.discountValue
            )}
          </Text>
        </View>
      )}

      {totals.shippingCost > 0 && (
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Shipping</Text>
          <Text style={styles.totalValue}>{formatCurrency(totals.shippingCost)}</Text>
        </View>
      )}

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Tax (GST)</Text>
        <Text style={styles.totalValue}>{formatCurrency(totals.taxTotal)}</Text>
      </View>

      <View style={styles.totalRowBold}>
        <Text style={styles.totalLabelBold}>Total</Text>
        <Text style={styles.totalValueBold}>{formatCurrency(totals.total)}</Text>
      </View>

      {!isPaid && totals.balanceDue !== undefined && (
        <View style={styles.totalRowBold}>
          <Text style={styles.totalLabelBold}>Amount Due</Text>
          <Text style={styles.totalValueBold}>{formatCurrency(totals.balanceDue)}</Text>
        </View>
      )}
    </View>
  );
};

// --- Payment Section ---
interface PdfPaymentSectionProps {
  bankDetails: string | null;
  stripeCheckoutUrl: string | null;
  invoiceNumber: string;
  balanceDue: number;
}

export const PdfPaymentSection: React.FC<PdfPaymentSectionProps> = ({
  bankDetails,
  stripeCheckoutUrl,
  invoiceNumber,
  balanceDue,
}) => {
  if (!bankDetails && !stripeCheckoutUrl) return null;

  return (
    <View style={styles.paymentSection} wrap={false}>
      <Text style={styles.makePaymentHeader}>MAKE PAYMENT</Text>

      {bankDetails && (
        <View>
          <Text style={styles.paymentSubHeader}>Pay with bank transfer</Text>
          <Text style={styles.paymentText}>Please transfer payment to:</Text>
          {bankDetails.split("\n").map((line, i) => (
            <Text key={i} style={styles.paymentText}>
              {line}
            </Text>
          ))}
          <Text style={styles.paymentImportant}>
            IMPORTANT: You MUST include the invoice number as the payment reference.
          </Text>
        </View>
      )}

      {stripeCheckoutUrl && (
        <View style={styles.stripeContainer}>
          <Text style={styles.paymentSubHeader}>Pay online with card</Text>
          <Text style={styles.paymentText}>
            Click the link below to pay securely with your credit or debit card:
          </Text>
          <Link src={stripeCheckoutUrl} style={styles.stripeButton}>
            <Text style={styles.stripeButtonText}>
              Pay {formatCurrency(balanceDue)} Online
            </Text>
          </Link>
          <Text style={styles.stripePoweredBy}>Secure payment powered by Stripe</Text>
        </View>
      )}
    </View>
  );
};

// --- Payment Confirmation ---
interface PdfPaymentConfirmationProps {
  paidAt: string;
  total: number;
}

export const PdfPaymentConfirmation: React.FC<PdfPaymentConfirmationProps> = ({
  paidAt,
  total,
}) => {
  return (
    <View style={styles.paymentSection}>
      <View style={styles.paymentColumn}>
        <Text style={styles.paymentTitle}>Payment Confirmation</Text>
        <Text style={styles.paymentMethodContent}>Payment Method: Card Payment</Text>
        <Text style={styles.paymentMethodContent}>Date: {formatDate(paidAt)}</Text>
        <Text style={styles.paymentMethodContent}>Amount: {formatCurrency(total)}</Text>
      </View>
    </View>
  );
};

// --- Review Section ---
export const PdfReviewSection: React.FC = () => {
  return (
    <View style={styles.reviewSection}>
      <Text style={styles.reviewText}>
        Loved our service? A{" "}
        <Link src={REVIEW_URL} style={styles.reviewLink}>
          Google Review
        </Link>{" "}
        would really help other customers discover us, and you'll receive{" "}
        <Text style={{ fontWeight: "bold" }}>30% off the first $100 of an order of your choice</Text>{" "}
        as our way of saying thanks!
      </Text>
    </View>
  );
};

// --- Footer ---
interface PdfFooterProps {
  terms: string;
  reference: string;
}

export const PdfFooter: React.FC<PdfFooterProps> = ({ terms, reference }) => {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>{terms}</Text>
      <Text style={styles.footerText}>{reference}</Text>
    </View>
  );
};

