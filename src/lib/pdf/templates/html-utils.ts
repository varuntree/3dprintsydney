// HTML utility functions for PDF templates

export function escapeHtml(text: string): string {
  // Server-safe HTML escaping
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function wrapDocument(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  ${getStyles()}
</head>
<body>
  ${content}
</body>
</html>`;
}

function getStyles(): string {
  return `<style>
* {
  box-sizing: border-box;
}

@page {
  size: A4 portrait;
  margin: 12mm 12mm 18mm 12mm;
}

html, body {
  margin: 0;
  padding: 0;
  font-family: Helvetica, Arial, sans-serif;
  color: #1a1a1a;
  background: #fff;
  font-size: 11pt;
  line-height: 1.5;
}

.page-shell {
  width: 100%;
}

main.page-content {
  width: 100%;
  padding-bottom: 12mm;
}

.section {
  page-break-inside: avoid;
}

.block-avoid {
  page-break-inside: avoid;
  break-inside: avoid;
}

.header-table {
  width: 100%;
  margin-bottom: 8mm;
}

.header-table td {
  vertical-align: top;
}

.doc-title {
  font-size: 32pt;
  font-weight: bold;
  color: #1a1a1a;
}

.logo-cell {
  text-align: right;
}

.brand-logo {
  width: 40mm;
  height: 14.4mm;
  object-fit: contain;
}

.paid-indicator {
  text-align: center;
  font-size: 14pt;
  font-weight: bold;
  color: #059669;
  margin: 8mm 0;
}

.doc-info-table {
  width: 100%;
  margin-bottom: 4mm;
  border-collapse: collapse;
}

.doc-info-table td {
  vertical-align: top;
  width: 33.33%;
  padding-bottom: 3mm;
}

.doc-info-label {
  font-size: 11pt;
  font-weight: bold;
  color: #4a4a4a;
  margin-bottom: 2mm;
}

.doc-info-value {
  font-size: 10pt;
  color: #666666;
}

.info-table {
  width: 100%;
  margin-bottom: 15mm;
  border-collapse: collapse;
}

.info-table td {
  vertical-align: top;
  width: 50%;
  padding-right: 4mm;
}

.info-block {
  font-size: 11pt;
  color: #4a4a4a;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.info-block strong {
  color: #1a1a1a;
}

.large-amount {
  font-size: 24pt;
  font-weight: bold;
  color: #1a1a1a;
  margin-bottom: 8mm;
}

.review-text {
  font-size: 10pt;
  color: #666666;
  margin-bottom: 6mm;
  line-height: 1.5;
}

.review-text a {
  color: #666666;
  text-decoration: underline;
}

.thank-you-text {
  text-align: center;
  font-size: 10pt;
  font-weight: bold;
  color: #059669;
  margin-bottom: 6mm;
}

table.items-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 8mm;
  font-size: 9pt;
  page-break-inside: auto;
}

table.items-table thead th {
  background-color: #f8f9fa;
  color: #4a4a4a;
  font-weight: bold;
  text-align: center;
  padding: 6mm 3mm;
  border: 0.5pt solid #e5e7eb;
}

table.items-table thead {
  display: table-header-group;
}

table.items-table tbody {
  display: table-row-group;
}

table.items-table tr {
  page-break-inside: avoid;
  break-inside: avoid;
}

table.items-table tbody td {
  padding: 4mm 3mm;
  border: 0.5pt solid #e5e7eb;
  color: #1a1a1a;
  vertical-align: top;
}

table.items-table tbody td:first-child {
  text-align: left;
}

table.items-table tbody td:not(:first-child) {
  text-align: right;
}

.item-title {
  font-weight: bold;
  color: #1a1a1a;
  margin-bottom: 1mm;
}

.item-description {
  color: #4a4a4a;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
}

.totals-wrapper {
  width: 100%;
  margin-bottom: 20mm;
  display: flex;
  justify-content: flex-end;
}

.totals-table {
  width: 70mm;
}

.totals-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1mm;
  line-height: 1.4;
}

.totals-label {
  font-size: 11pt;
  color: #4a4a4a;
}

.totals-value {
  font-size: 11pt;
  color: #4a4a4a;
  text-align: right;
}

.totals-row.bold .totals-label,
.totals-row.bold .totals-value {
  font-weight: bold;
  color: #1a1a1a;
}

.payment-confirmation {
  text-align: center;
  margin-bottom: 20mm;
  page-break-inside: avoid;
  break-inside: avoid;
}

.payment-confirmation-title {
  font-size: 12pt;
  font-weight: bold;
  color: #059669;
  margin-bottom: 4mm;
}

.payment-details-table {
  margin: 0 auto;
  width: 120mm;
  border-collapse: collapse;
  background-color: #f8f9fa;
  border: 0.5pt solid #e5e7eb;
}

.payment-details-table td {
  padding: 3mm;
  font-size: 10pt;
  color: #4a4a4a;
}

.payment-details-table td:first-child {
  text-align: left;
}

.payment-details-table td:last-child {
  text-align: right;
}

.payment-section {
  margin-bottom: 20mm;
  page-break-inside: avoid;
  break-inside: avoid;
}

.payment-section-title {
  font-size: 12pt;
  font-weight: bold;
  color: #1a1a1a;
  text-align: center;
  margin-bottom: 4mm;
}

.payment-methods-table {
  width: 100%;
  border-collapse: collapse;
}

.payment-methods-table td {
  vertical-align: top;
  width: 50%;
  padding: 0 2mm;
  word-break: break-word;
}

.payment-method-title {
  font-size: 12pt;
  font-weight: bold;
  color: #1a1a1a;
  margin-bottom: 2mm;
}

.payment-method-content {
  font-size: 11pt;
  color: #4a4a4a;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.payment-method-content strong {
  color: #1a1a1a;
}

.stripe-box {
  border: 0.5pt solid #e5e7eb;
  background-color: #f8f9fa;
  padding: 3mm;
  text-align: center;
}

.stripe-link {
  font-size: 12pt;
  font-weight: bold;
  color: #6366f1;
  text-decoration: none;
}

.stripe-note {
  font-size: 10pt;
  color: #666666;
  margin-top: 2mm;
}

.payment-important {
  font-size: 9pt;
  font-weight: bold;
  color: #1a1a1a;
  margin-top: 2mm;
}

.notes-section {
  margin-bottom: 8mm;
  page-break-inside: avoid;
  break-inside: avoid;
}

.notes-title {
  font-size: 12pt;
  font-weight: bold;
  color: #1a1a1a;
  margin-bottom: 4mm;
}

.notes-content {
  font-size: 11pt;
  color: #4a4a4a;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

footer {
  font-size: 7pt;
  color: #999999;
  line-height: 1.4;
  margin-top: auto;
  padding-top: 4mm;
}

.footer-reference {
  font-size: 9pt;
  color: #666666;
  text-align: center;
  margin-top: 3mm;
}

.clearfix::after {
  content: "";
  display: table;
  clear: both;
}
</style>`;
}
