import type { LineItem } from './components';

export type PageBreakInfo = {
  pageNumber: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  items: LineItem[];
  isLastPage: boolean;
};

export type PaginationConfig = {
  itemsPerPage: number;
  headerHeight: number;
  footerHeight: number;
  itemHeight: number;
  pageHeight: number;
  reservedSpaceLastPage: number; // Space to reserve for totals/payment info
};

export const DEFAULT_PAGINATION_CONFIG: PaginationConfig = {
  itemsPerPage: 25, // Conservative estimate
  headerHeight: 200,
  footerHeight: 60,
  itemHeight: 35, // Includes padding and borders
  pageHeight: 1000, // A4 minus margins
  reservedSpaceLastPage: 300, // Space for financial summary + payment info
};

/**
 * Calculate pagination for line items based on available space
 */
export function paginateLineItems(
  items: LineItem[],
  config: PaginationConfig = DEFAULT_PAGINATION_CONFIG
): PageBreakInfo[] {
  if (items.length === 0) {
    return [];
  }

  const pages: PageBreakInfo[] = [];
  let currentIndex = 0;
  let pageNumber = 1;

  while (currentIndex < items.length) {
    const remainingItems = items.length - currentIndex;
    const isLastBatch = remainingItems <= config.itemsPerPage;

    // On the last page, reserve space for financial summary and payment info
    const availableSpace = isLastBatch
      ? config.pageHeight - config.headerHeight - config.footerHeight - config.reservedSpaceLastPage
      : config.pageHeight - config.headerHeight - config.footerHeight;

    const maxItemsForPage = Math.floor(availableSpace / config.itemHeight);
    const itemsForThisPage = Math.min(remainingItems, maxItemsForPage, config.itemsPerPage);

    // Ensure we don't create empty pages
    const actualItemsForPage = Math.max(1, itemsForThisPage);

    const endIndex = currentIndex + actualItemsForPage;
    const pageItems = items.slice(currentIndex, endIndex);

    pages.push({
      pageNumber,
      totalPages: 0, // Will be set after all pages are calculated
      startIndex: currentIndex,
      endIndex: endIndex - 1,
      items: pageItems,
      isLastPage: endIndex >= items.length,
    });

    currentIndex = endIndex;
    pageNumber++;
  }

  // Set total pages for all page objects
  const totalPages = pages.length;
  pages.forEach(page => {
    page.totalPages = totalPages;
  });

  return pages;
}

/**
 * Calculate estimated height for content to help with pagination decisions
 */
export function calculateContentHeight(
  itemCount: number,
  hasFinancialSummary: boolean = false,
  hasPaymentSection: boolean = false,
  hasTermsSection: boolean = false,
  config: PaginationConfig = DEFAULT_PAGINATION_CONFIG
): number {
  let height = config.headerHeight + config.footerHeight;

  // Line items
  height += itemCount * config.itemHeight;

  // Additional sections
  if (hasFinancialSummary) height += 120;
  if (hasPaymentSection) height += 150;
  if (hasTermsSection) height += 100;

  return height;
}

/**
 * Determine if content will fit on a single page
 */
export function willFitOnSinglePage(
  itemCount: number,
  hasFinancialSummary: boolean = false,
  hasPaymentSection: boolean = false,
  hasTermsSection: boolean = false,
  config: PaginationConfig = DEFAULT_PAGINATION_CONFIG
): boolean {
  const totalHeight = calculateContentHeight(
    itemCount,
    hasFinancialSummary,
    hasPaymentSection,
    hasTermsSection,
    config
  );

  return totalHeight <= config.pageHeight;
}

/**
 * Smart page break detection for complex content
 */
export function shouldBreakBeforeSection(
  currentPageContent: number,
  sectionHeight: number,
  config: PaginationConfig = DEFAULT_PAGINATION_CONFIG
): boolean {
  const availableSpace = config.pageHeight - config.headerHeight - config.footerHeight - currentPageContent;
  return availableSpace < sectionHeight;
}

/**
 * Advanced dynamic content measurement system
 * This JavaScript code runs in the browser context during PDF generation
 */
export function generateContentMeasurementScript(): string {
  return `
    // Dynamic content measurement for intelligent pagination
    (function() {
      'use strict';

      // Configuration
      const PAGE_HEIGHT = 842; // A4 height in points (297mm * 2.834)
      const PAGE_WIDTH = 595;   // A4 width in points (210mm * 2.834)
      const MARGIN_TOP = 57;    // 20mm in points
      const MARGIN_BOTTOM = 45; // 16mm in points
      const SAFE_ZONE = 20;     // Buffer zone to prevent edge cases

      const AVAILABLE_HEIGHT = PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM - SAFE_ZONE;

      // Measure actual content heights dynamically
      function measureElement(selector) {
        const element = document.querySelector(selector);
        if (!element) return 0;

        const styles = window.getComputedStyle(element);
        const height = element.getBoundingClientRect().height;
        const marginTop = parseFloat(styles.marginTop) || 0;
        const marginBottom = parseFloat(styles.marginBottom) || 0;

        return Math.ceil(height + marginTop + marginBottom);
      }

      // Measure all line items and determine optimal page breaks
      function optimizePagination() {
        const itemsTable = document.querySelector('.items-table');
        if (!itemsTable) return;

        const rows = Array.from(itemsTable.querySelectorAll('tbody tr'));
        if (rows.length === 0) return;

        // Measure fixed elements
        const headerHeight = measureElement('.document-header');
        const clientHeight = measureElement('.client-section');
        const tableHeaderHeight = measureElement('.items-table thead');
        const footerHeight = measureElement('.page-footer');

        let currentPageHeight = headerHeight + clientHeight + tableHeaderHeight + footerHeight;
        let pageBreakIndices = [];

        // Analyze each row and determine where to break
        rows.forEach((row, index) => {
          const rowHeight = row.getBoundingClientRect().height;

          // Check if adding this row would exceed page height
          if (currentPageHeight + rowHeight > AVAILABLE_HEIGHT) {
            // Insert page break before this row
            pageBreakIndices.push(index);

            // Reset height calculation for new page
            currentPageHeight = tableHeaderHeight + footerHeight + rowHeight;

            // Add page break marker
            const pageBreak = document.createElement('div');
            pageBreak.className = 'dynamic-page-break';
            pageBreak.style.cssText = 'page-break-before: always; break-before: page; height: 0; margin: 0; padding: 0;';
            row.parentNode.insertBefore(pageBreak, row);
          } else {
            currentPageHeight += rowHeight;
          }
        });

        // Handle last page sections (financial summary, payment info)
        const lastPageSections = [
          '.financial-summary',
          '.payment-section',
          '.terms-section'
        ];

        let lastPageContentHeight = 0;
        lastPageSections.forEach(selector => {
          lastPageContentHeight += measureElement(selector);
        });

        // If last page content won't fit, force a page break before financial summary
        if (currentPageHeight + lastPageContentHeight > AVAILABLE_HEIGHT) {
          const financialSummary = document.querySelector('.financial-summary');
          if (financialSummary) {
            const pageBreak = document.createElement('div');
            pageBreak.className = 'dynamic-page-break';
            pageBreak.style.cssText = 'page-break-before: always; break-before: page; height: 0; margin: 0; padding: 0;';
            financialSummary.parentNode.insertBefore(pageBreak, financialSummary);
          }
        }

        console.log('Dynamic pagination applied:', {
          totalRows: rows.length,
          pageBreaks: pageBreakIndices.length,
          headerHeight,
          availableHeight: AVAILABLE_HEIGHT
        });
      }

      // Apply orphan and widow control
      function applyOrphanWidowControl() {
        const style = document.createElement('style');
        style.textContent = \`
          /* Enhanced orphan/widow control */
          .items-table tbody tr {
            orphans: 2;
            widows: 2;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          /* Prevent single rows on new pages */
          .items-table tbody tr:nth-last-child(1),
          .items-table tbody tr:nth-last-child(2) {
            page-break-before: avoid;
            break-before: avoid;
          }

          /* Keep financial sections together */
          .financial-summary,
          .payment-section {
            orphans: 3;
            widows: 3;
          }

          /* Enhanced section grouping */
          .section-card {
            page-break-inside: avoid;
            break-inside: avoid;
            orphans: 2;
            widows: 2;
          }
        \`;
        document.head.appendChild(style);
      }

      // Initialize dynamic pagination when DOM is ready
      function initialize() {
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', function() {
            setTimeout(() => {
              applyOrphanWidowControl();
              optimizePagination();
            }, 100);
          });
        } else {
          setTimeout(() => {
            applyOrphanWidowControl();
            optimizePagination();
          }, 100);
        }
      }

      // Start the process
      initialize();
    })();
  `;
}

/**
 * Generate CSS page break rules with enhanced controls
 */
export function generatePageBreakCSS(): string {
  return `
    /* Enhanced page break controls */
    .page-break-before {
      page-break-before: always;
      break-before: page;
    }

    .page-break-after {
      page-break-after: always;
      break-after: page;
    }

    .page-break-inside-avoid {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .page-break-inside-auto {
      page-break-inside: auto;
      break-inside: auto;
    }

    /* Dynamic page breaks inserted by JavaScript */
    .dynamic-page-break {
      page-break-before: always !important;
      break-before: page !important;
      height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
    }

    /* Keep sections together with enhanced orphan/widow control */
    .document-header,
    .client-section,
    .financial-summary,
    .payment-section,
    .terms-section {
      page-break-inside: avoid;
      break-inside: avoid;
      orphans: 2;
      widows: 2;
    }

    /* Smart table pagination */
    .items-table {
      table-layout: fixed;
      width: 100%;
    }

    .items-table tbody tr {
      page-break-inside: avoid;
      break-inside: avoid;
      orphans: 2;
      widows: 2;
    }

    /* Prevent awkward single-row pages */
    .items-table tbody tr:nth-last-child(1),
    .items-table tbody tr:nth-last-child(2) {
      page-break-before: avoid;
      break-before: avoid;
    }

    /* Table headers repeat on new pages */
    .items-table thead {
      display: table-header-group;
    }

    .items-table tfoot {
      display: table-footer-group;
    }

    /* Enhanced page configuration */
    @page {
      margin: 20mm 16mm;
      size: A4 portrait;
      orphans: 2;
      widows: 2;
    }

    @page :first {
      margin-top: 20mm;
    }

    @page :left {
      margin-left: 20mm;
      margin-right: 16mm;
    }

    @page :right {
      margin-left: 16mm;
      margin-right: 20mm;
    }

    /* Print-specific optimizations */
    @media print {
      .page-continuation {
        display: block;
      }

      .page-indicator {
        display: block;
      }

      /* Ensure proper color printing */
      * {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        color-adjust: exact;
      }

      /* Optimize for print performance */
      body {
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }

      /* Enhanced section breaks */
      .section-card {
        page-break-inside: avoid;
        break-inside: avoid;
      }
    }

    /* Responsive improvements for different paper sizes */
    @media print and (width: 8.5in) {
      /* US Letter size adjustments */
      @page {
        size: letter portrait;
        margin: 0.75in 0.5in;
      }
    }
  `;
}