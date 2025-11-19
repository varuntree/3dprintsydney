import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { InvoicePdfDocument } from "../types";
import {
  COLORS,
  formatDate,
  formatCurrency,
  discountLabel,
  parseCalculatorBreakdown,
  formatMultiline,
  REVIEW_HTML,
  REVIEW_URL,
} from "./shared";

const PAGE_WIDTH = 210; // A4 width in mm
const PAGE_HEIGHT = 297; // A4 height in mm
const MARGIN = 12; // mm
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

export function renderInvoiceTemplate(
  pdf: jsPDF,
  doc: InvoicePdfDocument
): void {
  let yPos = MARGIN;
  const isPaid = doc.document.status === "paid";

  // 1. Header
  pdf.setFontSize(32);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(COLORS.darkText);
  pdf.text("Invoice", MARGIN, yPos + 10);

  // Logo placeholder (right-aligned) - would need actual logo implementation
  // For now, just add business name on the right
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");
  const businessNameWidth = pdf.getTextWidth(doc.business.name);
  pdf.text(doc.business.name, PAGE_WIDTH - MARGIN - businessNameWidth, yPos + 6);

  yPos += 18;

  // 2. Paid Indicator
  if (isPaid) {
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(COLORS.paidGreen);
    const paidText = "✓ PAID";
    const paidWidth = pdf.getTextWidth(paidText);
    pdf.text(paidText, (PAGE_WIDTH - paidWidth) / 2, yPos);
    pdf.setTextColor(COLORS.darkText);
    yPos += 8;
  }

  // 3. Document Info Table
  const docInfoData = [
    ["Invoice Number", "Date Issued", isPaid ? "Paid Date" : "Payment Terms"],
    [
      doc.document.number,
      formatDate(doc.document.issueDate),
      isPaid ? formatDate(doc.document.paidAt) : doc.document.paymentTerms || "",
    ],
  ];

  autoTable(pdf, {
    startY: yPos,
    head: [docInfoData[0]],
    body: [docInfoData[1]],
    theme: "plain",
    styles: {
      fontSize: 10,
      cellPadding: 3,
    },
    headStyles: {
      fontStyle: "bold",
      fontSize: 11,
      textColor: COLORS.darkText,
    },
    columnStyles: {
      0: { cellWidth: CONTENT_WIDTH / 3 },
      1: { cellWidth: CONTENT_WIDTH / 3 },
      2: { cellWidth: CONTENT_WIDTH / 3 },
    },
    margin: { left: MARGIN, right: MARGIN },
  });

  yPos = (pdf as any).lastAutoTable.finalY + 8;

  // 4. Business & Client Info
  const businessLines = [
    doc.business.name,
    doc.business.address,
    doc.business.phone,
    doc.business.email,
    doc.business.abn ? `ABN: ${doc.business.abn}` : "",
  ].filter(Boolean);

  const clientLines = ["Bill to:", doc.client.name];

  autoTable(pdf, {
    startY: yPos,
    body: [[businessLines.join("\n"), clientLines.join("\n")]],
    theme: "plain",
    styles: {
      fontSize: 11,
      cellPadding: 3,
      textColor: COLORS.darkText,
    },
    columnStyles: {
      0: { cellWidth: CONTENT_WIDTH / 2 },
      1: { cellWidth: CONTENT_WIDTH / 2, fontStyle: "bold" },
    },
    margin: { left: MARGIN, right: MARGIN },
  });

  yPos = (pdf as any).lastAutoTable.finalY + 8;

  // 5. Large Amount Display
  pdf.setFontSize(24);
  pdf.setFont("helvetica", "bold");
  const amountText = isPaid
    ? `${formatCurrency(doc.totals.total)} PAID`
    : `${formatCurrency(doc.totals.balanceDue)} due ${doc.document.dueDate ? formatDate(doc.document.dueDate) : "immediately"}`;
  pdf.text(amountText, MARGIN, yPos);
  yPos += 10;

  // 6. Thank You / Review Text
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  if (isPaid) {
    pdf.setTextColor(COLORS.paidGreen);
    pdf.text("Thank you for your payment!", MARGIN, yPos);
  } else {
    pdf.setTextColor(COLORS.lightText);
    // Simplified review text without HTML formatting
    const reviewText =
      "Loved our service? A Google Review would help other customers discover us,";
    const reviewText2 =
      "and you'll receive 30% off the first $100 of an order as our way of saying thanks!";
    pdf.text(reviewText, MARGIN, yPos);
    yPos += 4;
    pdf.text(reviewText2, MARGIN, yPos);
  }
  pdf.setTextColor(COLORS.darkText);
  yPos += 8;

  // 7. Line Items Table
  const hasDiscounts = doc.lines.some(
    (line) => line.discountValue && line.discountValue > 0
  );

  const lineHeaders = hasDiscounts
    ? ["Description", "Qty", "Orig. Price", "Discount", "Disc. Price", "Total"]
    : ["Description", "Qty", "Unit Price", "Total"];

  const lineRows = doc.lines.map((line) => {
    const description = line.description
      ? `${line.name}\n${line.description}`
      : line.name;
    const breakdown = parseCalculatorBreakdown(line.description);
    const fullDescription =
      breakdown.length > 0
        ? `${line.name}\n${breakdown.map((b) => `• ${b}`).join("\n")}`
        : description;

    if (hasDiscounts) {
      const origPrice = line.discountValue
        ? line.unitPrice + (line.discountType === "percentage"
            ? (line.unitPrice * (line.discountValue / 100))
            : (line.discountValue / line.quantity))
        : line.unitPrice;

      return [
        fullDescription,
        `${line.quantity} ${line.unit}`,
        formatCurrency(origPrice),
        discountLabel(line.discountType, line.discountValue),
        formatCurrency(line.unitPrice),
        formatCurrency(line.total),
      ];
    } else {
      return [
        fullDescription,
        `${line.quantity} ${line.unit}`,
        formatCurrency(line.unitPrice),
        formatCurrency(line.total),
      ];
    }
  });

  autoTable(pdf, {
    startY: yPos,
    head: [lineHeaders],
    body: lineRows,
    theme: "grid",
    styles: {
      fontSize: 9,
      cellPadding: 3,
      textColor: COLORS.darkText,
      lineColor: COLORS.borderGray,
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: COLORS.lightGray,
      textColor: COLORS.darkText,
      fontStyle: "bold",
      fontSize: 9,
    },
    columnStyles: hasDiscounts
      ? {
          0: { cellWidth: 85 },
          1: { cellWidth: 15 },
          2: { cellWidth: 25, halign: "right" },
          3: { cellWidth: 20, halign: "right" },
          4: { cellWidth: 25, halign: "right" },
          5: { cellWidth: 16, halign: "right" },
        }
      : {
          0: { cellWidth: 120 },
          1: { cellWidth: 20 },
          2: { cellWidth: 25, halign: "right" },
          3: { cellWidth: 21, halign: "right" },
        },
    margin: { left: MARGIN, right: MARGIN },
  });

  yPos = (pdf as any).lastAutoTable.finalY + 5;

  // 8. Totals Section
  const totalsData: string[][] = [
    ["Subtotal", formatCurrency(doc.totals.subtotal)],
  ];

  if (doc.totals.discountValue && doc.totals.discountValue > 0) {
    totalsData.push([
      `Discount (${discountLabel(doc.totals.discountType, doc.totals.discountValue)})`,
      `-${formatCurrency(
        doc.totals.discountType === "percentage"
          ? (doc.totals.subtotal * doc.totals.discountValue) / 100
          : doc.totals.discountValue
      )}`,
    ]);
  }

  if (doc.totals.shippingCost > 0) {
    totalsData.push(["Shipping", formatCurrency(doc.totals.shippingCost)]);
  }

  totalsData.push(["Tax (GST)", formatCurrency(doc.totals.taxTotal)]);
  totalsData.push(["Total", formatCurrency(doc.totals.total)]);

  if (!isPaid) {
    totalsData.push(["Amount Due", formatCurrency(doc.totals.balanceDue)]);
  }

  autoTable(pdf, {
    startY: yPos,
    body: totalsData,
    theme: "plain",
    styles: {
      fontSize: 11,
      cellPadding: 2,
      textColor: COLORS.darkText,
    },
    columnStyles: {
      0: { cellWidth: CONTENT_WIDTH - 70, halign: "right" },
      1: { cellWidth: 70, halign: "right", fontStyle: "bold" },
    },
    margin: { left: MARGIN, right: MARGIN },
    didParseCell: (data) => {
      const lastTwoRows = totalsData.length - (isPaid ? 1 : 2);
      if (data.row.index >= lastTwoRows) {
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  yPos = (pdf as any).lastAutoTable.finalY + 8;

  // 9. Payment Confirmation (if paid)
  if (isPaid && doc.document.paidAt) {
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(COLORS.paidGreen);
    pdf.text("Payment Confirmation", MARGIN, yPos);
    pdf.setTextColor(COLORS.darkText);
    yPos += 6;

    const paymentData = [
      ["Payment Method", "Date", "Amount"],
      ["Card Payment", formatDate(doc.document.paidAt), formatCurrency(doc.totals.total)],
    ];

    autoTable(pdf, {
      startY: yPos,
      head: [paymentData[0]],
      body: [paymentData[1]],
      theme: "grid",
      styles: {
        fontSize: 10,
        cellPadding: 3,
        lineColor: COLORS.borderGray,
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: COLORS.lightGray,
        textColor: COLORS.darkText,
        fontStyle: "bold",
      },
      margin: { left: MARGIN, right: MARGIN },
    });

    yPos = (pdf as any).lastAutoTable.finalY + 8;
  }

  // 10. Payment Section (if unpaid)
  if (!isPaid) {
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text("Payment Options", MARGIN, yPos);
    yPos += 6;

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");

    // Bank Transfer section
    if (doc.bankDetails) {
      pdf.text("Bank Transfer", MARGIN, yPos);
      yPos += 5;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      const bankLines = formatMultiline(doc.bankDetails);
      bankLines.forEach((line) => {
        pdf.text(line, MARGIN, yPos);
        yPos += 4;
      });

      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(COLORS.accentBlue);
      pdf.text(
        `⚠️ You MUST include invoice number ${doc.document.number} as reference`,
        MARGIN,
        yPos
      );
      pdf.setTextColor(COLORS.darkText);
      yPos += 6;
    }

    // Stripe Payment
    if (doc.stripeCheckoutUrl) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text("Pay Online with Stripe", MARGIN, yPos);
      yPos += 5;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(COLORS.accentBlue);
      pdf.textWithLink(`Pay ${formatCurrency(doc.totals.balanceDue)} Online`, MARGIN, yPos, {
        url: doc.stripeCheckoutUrl,
      });
      pdf.setTextColor(COLORS.darkText);
      yPos += 8;
    }
  }

  // 11. Notes Section
  if (doc.notes && doc.notes.trim().length > 0) {
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text("Notes", MARGIN, yPos);
    yPos += 5;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    const noteLines = formatMultiline(doc.notes);
    noteLines.forEach((line) => {
      pdf.text(line, MARGIN, yPos);
      yPos += 5;
    });
    yPos += 3;
  }

  // 12. Footer
  const footerY = PAGE_HEIGHT - 15;
  pdf.setFontSize(7);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(COLORS.footerGray);

  const termsLines = formatMultiline(doc.terms);
  let termsY = footerY - termsLines.length * 3;
  termsLines.forEach((line) => {
    pdf.text(line, MARGIN, termsY);
    termsY += 3;
  });

  // Reference line
  const refText = isPaid
    ? `${doc.document.number} • ${formatCurrency(doc.totals.total)} paid ${formatDate(doc.document.paidAt)}`
    : `${doc.document.number} • ${formatCurrency(doc.totals.balanceDue)} due ${doc.document.dueDate ? formatDate(doc.document.dueDate) : "immediately"}`;
  pdf.text(refText, MARGIN, PAGE_HEIGHT - 8);
}
