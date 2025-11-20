import { StyleSheet, Font } from "@react-pdf/renderer";

// Register fonts if needed, but Helvetica is standard
// Font.register({ family: 'Helvetica', src: '...' });

export const COLORS = {
  darkText: "#1a1a1a",
  mediumText: "#4a4a4a",
  lightText: "#666666",
  accentBlue: "#6366f1",
  lightGray: "#f8f9fa",
  borderGray: "#e5e7eb",
  footerGray: "#999999",
  paidGreen: "#059669",
} as const;

export const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.5,
    padding: 40, // Approx 14mm
    color: COLORS.mediumText,
    backgroundColor: "#ffffff",
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: COLORS.darkText,
  },
  logo: {
    width: 120,
    height: "auto",
    objectFit: "contain",
  },
  paidIndicator: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.paidGreen,
    textAlign: "center",
    marginTop: -20,
    marginBottom: 20,
  },
  
  // Document Info Table
  docInfoTable: {
    flexDirection: "row",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderGray,
    paddingBottom: 10,
  },
  docInfoCol: {
    flex: 1,
  },
  docInfoLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: COLORS.darkText,
    marginBottom: 2,
  },
  docInfoValue: {
    fontSize: 10,
    color: COLORS.mediumText,
  },

  // Business & Client Info
  infoSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  infoBlock: {
    width: "45%",
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: COLORS.darkText,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 10,
    color: COLORS.mediumText,
  },

  // Large Amount
  largeAmount: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.darkText,
    textAlign: "right",
    marginTop: 10,
    marginBottom: 20,
  },

  // Line Items Table
  table: {
    width: "100%",
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderGray,
    paddingBottom: 8,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  // Columns
  colDesc: { flex: 2 },
  colQty: { width: "10%", textAlign: "right" },
  colPrice: { width: "15%", textAlign: "right" },
  colTotal: { width: "15%", textAlign: "right" },
  // With discount
  colDescWide: { flex: 2 },
  colQtySmall: { width: "8%", textAlign: "right" },
  colPriceSmall: { width: "12%", textAlign: "right" },
  colDiscount: { width: "10%", textAlign: "right" },
  colDiscPrice: { width: "12%", textAlign: "right" },
  colTotalSmall: { width: "12%", textAlign: "right" },

  th: {
    fontSize: 9,
    fontWeight: "bold",
    color: COLORS.darkText,
  },
  td: {
    fontSize: 9,
    color: COLORS.mediumText,
  },
  itemTitle: {
    fontWeight: "bold",
    color: COLORS.darkText,
    marginBottom: 2,
  },
  itemDesc: {
    fontSize: 8,
    color: COLORS.lightText,
  },

  // Totals
  totalsSection: {
    flexDirection: "column",
    alignItems: "flex-end",
    marginTop: 10,
    marginBottom: 30,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 4,
    width: "50%",
  },
  totalLabel: {
    width: "60%",
    textAlign: "right",
    paddingRight: 10,
    fontSize: 10,
  },
  totalValue: {
    width: "40%",
    textAlign: "right",
    fontSize: 10,
    color: COLORS.darkText,
  },
  totalRowBold: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
    width: "50%",
    borderTopWidth: 1,
    borderTopColor: COLORS.borderGray,
    paddingTop: 8,
  },
  totalLabelBold: {
    width: "60%",
    textAlign: "right",
    paddingRight: 10,
    fontSize: 12,
    fontWeight: "bold",
    color: COLORS.darkText,
  },
  totalValueBold: {
    width: "40%",
    textAlign: "right",
    fontSize: 12,
    fontWeight: "bold",
    color: COLORS.darkText,
  },

  // Payment Section
  paymentSection: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderGray,
    paddingTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  paymentColumn: {
    width: "48%",
  },
  paymentTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: COLORS.darkText,
    marginBottom: 8,
  },
  stripeBox: {
    backgroundColor: "#f7faff", // Light blue-ish
    padding: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#dbeafe",
  },
  stripeLink: {
    color: "#2563eb",
    fontSize: 12,
    fontWeight: "bold",
    textDecoration: "none",
    marginBottom: 4,
    display: "block",
  },
  stripeNote: {
    fontSize: 8,
    color: COLORS.lightText,
  },
  paymentMethodTitle: {
    fontWeight: "bold",
    fontSize: 10,
    marginBottom: 4,
    color: COLORS.darkText,
  },
  paymentMethodContent: {
    fontSize: 9,
    color: COLORS.mediumText,
    lineHeight: 1.4,
  },
  paymentImportant: {
    marginTop: 6,
    fontSize: 9,
    color: "#dc2626", // Red
    fontStyle: "italic",
  },

  // Notes
  notesSection: {
    marginTop: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderGray,
  },
  notesTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: COLORS.darkText,
    marginBottom: 4,
  },
  notesContent: {
    fontSize: 9,
    color: COLORS.mediumText,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: COLORS.borderGray,
    paddingTop: 10,
  },
  footerText: {
    fontSize: 8,
    color: COLORS.footerGray,
    marginBottom: 4,
  },
  reviewSection: {
    marginTop: 20,
    marginBottom: 20,
    padding: 10,
    backgroundColor: COLORS.lightGray,
    borderRadius: 4,
  },
  reviewText: {
    fontSize: 9,
    color: COLORS.mediumText,
    textAlign: "center",
  },
  reviewLink: {
    color: COLORS.mediumText,
    textDecoration: "underline",
    fontWeight: "bold",
  },
});

