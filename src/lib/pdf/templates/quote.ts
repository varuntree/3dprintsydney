import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { QuotePdfDocument } from "../types";
import {
  COLORS,
  formatDate,
  formatCurrency,
  discountLabel,
  parseCalculatorBreakdown,
  formatMultiline,
} from "./shared";

const PAGE_WIDTH = 210; // A4 width in mm
const PAGE_HEIGHT = 297; // A4 height in mm
const MARGIN = 12; // mm
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

export function renderQuoteTemplate(pdf: jsPDF, doc: QuotePdfDocument): void {
  let yPos = MARGIN;

  // 1. Header
  pdf.setFontSize(32);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(COLORS.darkText);
  pdf.text("Quote", MARGIN, yPos + 10);

  // Logo placeholder (right-aligned) - would need actual logo implementation
  // For now, just add business name on the right
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");
  const businessNameWidth = pdf.getTextWidth(doc.business.name);
  pdf.text(doc.business.name, PAGE_WIDTH - MARGIN - businessNameWidth, yPos + 6);

  yPos += 18;

  // 2. Document Info Table
  const docInfoData = [
    ["Quote Number", "Date Issued", "Valid Until"],
    [
      doc.document.number,
      formatDate(doc.document.issueDate),
      doc.document.validUntil ? formatDate(doc.document.validUntil) : "N/A",
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

  // 3. Business & Client Info
  const businessLines = [
    doc.business.name,
    doc.business.address,
    doc.business.phone,
    doc.business.email,
    doc.business.abn ? `ABN: ${doc.business.abn}` : "",
  ].filter(Boolean);

  const clientLines = ["Quote for:", doc.client.name];

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

  // 4. Large Amount Display
  pdf.setFontSize(24);
  pdf.setFont("helvetica", "bold");
  const amountText = doc.document.validUntil
    ? `${formatCurrency(doc.totals.total)} valid until ${formatDate(doc.document.validUntil)}`
    : `${formatCurrency(doc.totals.total)}`;
  pdf.text(amountText, MARGIN, yPos);
  yPos += 12;

  // 5. Line Items Table
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
        ? line.unitPrice +
          (line.discountType === "percentage"
            ? line.unitPrice * (line.discountValue / 100)
            : line.discountValue / line.quantity)
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

  // 6. Totals Section
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
      // Make last row (Total) bold
      if (data.row.index === totalsData.length - 1) {
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  yPos = (pdf as any).lastAutoTable.finalY + 8;

  // 7. Notes Section
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

  // 8. Footer
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
  const refText = doc.document.validUntil
    ? `${doc.document.number} • quote expires ${formatDate(doc.document.validUntil)}`
    : doc.document.number;
  pdf.text(refText, MARGIN, PAGE_HEIGHT - 8);
}
