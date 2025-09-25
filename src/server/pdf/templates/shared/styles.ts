import { generatePageBreakCSS, generateContentMeasurementScript } from './pagination';

export const baseStyles = `
  /* Enhanced Page Setup with Orphan/Widow Control */
  @page {
    size: A4 portrait;
    margin: 20mm 16mm;
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

  /* Reset and Base Styles */
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Modern Font Import */
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

  html, body {
    margin: 0;
    padding: 0;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    color: #0f1419;
    background: #ffffff;
    font-weight: 400;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* Modern Professional Color System */
  :root {
    /* Typography Colors */
    --color-text-primary: #0f1419;
    --color-text-secondary: #4a5568;
    --color-text-tertiary: #718096;
    --color-text-muted: #a0aec0;
    --color-text-inverse: #ffffff;

    /* Brand Colors */
    --color-brand-primary: #1a365d;
    --color-brand-secondary: #2d3748;
    --color-brand-accent: #3182ce;
    --color-brand-light: #e2e8f0;

    /* Status Colors */
    --color-success: #38a169;
    --color-success-light: #c6f6d5;
    --color-warning: #d69e2e;
    --color-warning-light: #faf2dd;
    --color-danger: #e53e3e;
    --color-danger-light: #fed7d7;
    --color-info: #3182ce;
    --color-info-light: #bee3f8;

    /* Neutral Colors */
    --color-gray-50: #f9fafb;
    --color-gray-100: #f4f5f7;
    --color-gray-200: #e2e8f0;
    --color-gray-300: #cbd5e0;
    --color-gray-400: #a0aec0;
    --color-gray-500: #718096;
    --color-gray-600: #4a5568;
    --color-gray-700: #2d3748;
    --color-gray-800: #1a202c;
    --color-gray-900: #0f1419;

    /* Border Colors */
    --color-border-light: #e2e8f0;
    --color-border-default: #cbd5e0;
    --color-border-strong: #a0aec0;

    /* Background Colors */
    --color-bg-primary: #ffffff;
    --color-bg-secondary: #f9fafb;
    --color-bg-tertiary: #f4f5f7;
    --color-bg-accent: #e2e8f0;

    /* Shadow System */
    --shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    --shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);

    /* Border Radius System */
    --radius-sm: 4px;
    --radius-md: 6px;
    --radius-lg: 8px;
    --radius-xl: 12px;
    --radius-2xl: 16px;

    /* Typography Scale */
    --text-xs: 12px;
    --text-sm: 13px;
    --text-base: 14px;
    --text-lg: 16px;
    --text-xl: 18px;
    --text-2xl: 20px;
    --text-3xl: 24px;
    --text-4xl: 32px;
    --text-5xl: 48px;

    /* Font Weights */
    --font-light: 300;
    --font-normal: 400;
    --font-medium: 500;
    --font-semibold: 600;
    --font-bold: 700;

    /* Spacing Scale */
    --space-1: 4px;
    --space-2: 8px;
    --space-3: 12px;
    --space-4: 16px;
    --space-5: 20px;
    --space-6: 24px;
    --space-8: 32px;
    --space-10: 40px;
    --space-12: 48px;
    --space-16: 64px;
  }

  /* Document Structure */
  .document-container {
    max-width: 210mm;
    margin: 0 auto;
    background: var(--color-bg-primary);
    padding: var(--space-8);
  }

  /* Modern Card System */
  .card {
    background: var(--color-bg-primary);
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-border-light);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
  }

  .card-header {
    padding: var(--space-6) var(--space-8);
    border-bottom: 1px solid var(--color-border-light);
    background: var(--color-bg-secondary);
  }

  .card-body {
    padding: var(--space-6) var(--space-8);
  }

  .card-footer {
    padding: var(--space-4) var(--space-8);
    background: var(--color-bg-secondary);
    border-top: 1px solid var(--color-border-light);
  }

  /* Typography Components */
  .text-xs { font-size: var(--text-xs); }
  .text-sm { font-size: var(--text-sm); }
  .text-base { font-size: var(--text-base); }
  .text-lg { font-size: var(--text-lg); }
  .text-xl { font-size: var(--text-xl); }
  .text-2xl { font-size: var(--text-2xl); }
  .text-3xl { font-size: var(--text-3xl); }
  .text-4xl { font-size: var(--text-4xl); }
  .text-5xl { font-size: var(--text-5xl); }

  .font-light { font-weight: var(--font-light); }
  .font-normal { font-weight: var(--font-normal); }
  .font-medium { font-weight: var(--font-medium); }
  .font-semibold { font-weight: var(--font-semibold); }
  .font-bold { font-weight: var(--font-bold); }

  .text-primary { color: var(--color-text-primary); }
  .text-secondary { color: var(--color-text-secondary); }
  .text-tertiary { color: var(--color-text-tertiary); }
  .text-muted { color: var(--color-text-muted); }

  /* Spacing Utilities */
  .space-y-1 > * + * { margin-top: var(--space-1); }
  .space-y-2 > * + * { margin-top: var(--space-2); }
  .space-y-3 > * + * { margin-top: var(--space-3); }
  .space-y-4 > * + * { margin-top: var(--space-4); }
  .space-y-6 > * + * { margin-top: var(--space-6); }
  .space-y-8 > * + * { margin-top: var(--space-8); }

  /* Page Break Controls */
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

  /* Modern Header Styles */
  .modern-header {
    margin-bottom: var(--space-12);
  }

  .brand-hero {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--space-8);
    padding: var(--space-8) 0;
    background: linear-gradient(135deg, var(--color-brand-primary) 0%, var(--color-brand-secondary) 100%);
    border-radius: var(--radius-xl);
    position: relative;
    overflow: hidden;
  }

  .brand-hero::before {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 200px;
    height: 200px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 50%;
    transform: translate(50%, -50%);
  }

  .brand-identity {
    display: flex;
    align-items: center;
    gap: var(--space-5);
    padding-left: var(--space-8);
    z-index: 1;
    position: relative;
  }

  .brand-logo {
    width: 80px;
    height: 80px;
    border-radius: var(--radius-lg);
    background: var(--color-bg-primary);
    padding: var(--space-3);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow-lg);
  }

  .logo-image {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }

  .brand-logo-placeholder {
    width: 80px;
    height: 80px;
    background: var(--color-brand-accent);
    color: var(--color-text-inverse);
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow-lg);
  }

  .logo-initials {
    font-size: var(--text-3xl);
    font-weight: var(--font-bold);
  }

  .brand-info {
    color: var(--color-text-inverse);
  }

  .company-name {
    font-size: var(--text-4xl);
    font-weight: var(--font-bold);
    margin: 0;
    line-height: 1.2;
    letter-spacing: -0.02em;
  }

  .company-tagline {
    font-size: var(--text-lg);
    font-weight: var(--font-normal);
    opacity: 0.9;
    margin-top: var(--space-2);
  }

  .document-badge {
    padding-right: var(--space-8);
    text-align: right;
    z-index: 1;
    position: relative;
  }

  .doc-type {
    font-size: var(--text-2xl);
    font-weight: var(--font-bold);
    color: var(--color-text-inverse);
    margin-bottom: var(--space-2);
  }

  .status-indicator {
    display: inline-block;
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-lg);
    font-size: var(--text-sm);
    font-weight: var(--font-semibold);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .status-paid {
    background: var(--color-success-light);
    color: var(--color-success);
  }

  .status-pending {
    background: var(--color-warning-light);
    color: var(--color-warning);
  }

  .status-overdue {
    background: var(--color-danger-light);
    color: var(--color-danger);
  }

  .status-accepted {
    background: var(--color-success-light);
    color: var(--color-success);
  }

  .status-declined {
    background: var(--color-danger-light);
    color: var(--color-danger);
  }

  /* Meta Card Styles */
  .meta-card {
    margin-bottom: var(--space-6);
  }

  .meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-8);
  }

  .meta-column {
    space-y: var(--space-4);
  }

  .meta-item {
    margin-bottom: var(--space-4);
  }

  .meta-label {
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: var(--color-text-tertiary);
    margin-bottom: var(--space-1);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .meta-value {
    font-size: var(--text-base);
    color: var(--color-text-primary);
  }

  .total-section,
  .balance-section {
    text-align: right;
  }

  .total-label,
  .balance-label {
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: var(--color-text-tertiary);
    margin-bottom: var(--space-1);
  }

  .total-value {
    font-size: var(--text-3xl);
    font-weight: var(--font-bold);
    color: var(--color-brand-primary);
  }

  .balance-value {
    font-size: var(--text-xl);
    font-weight: var(--font-semibold);
  }

  .balance-value.outstanding {
    color: var(--color-danger);
  }

  .balance-value.paid {
    color: var(--color-success);
  }

  /* Business Card Styles */
  .business-card {
    margin-bottom: var(--space-8);
  }

  .business-details-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--space-6);
  }

  .detail-group {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
  }

  .detail-icon {
    font-size: var(--text-lg);
    width: 32px;
    height: 32px;
    background: var(--color-bg-accent);
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .detail-content {
    flex: 1;
  }

  .detail-label {
    font-size: var(--text-xs);
    font-weight: var(--font-medium);
    color: var(--color-text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: var(--space-1);
  }

  .detail-value {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    line-height: 1.4;
  }

  /* Modern Client Card Styles */
  .client-card {
    margin-bottom: var(--space-8);
  }

  .client-header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .client-badge {
    display: flex;
    align-items: center;
    gap: var(--space-4);
  }

  .client-avatar {
    width: 48px;
    height: 48px;
    background: var(--color-brand-accent);
    color: var(--color-text-inverse);
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--text-lg);
    font-weight: var(--font-semibold);
  }

  .client-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .client-label {
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: var(--color-text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .client-name {
    font-size: var(--text-xl);
    font-weight: var(--font-semibold);
    color: var(--color-text-primary);
  }

  .document-summary {
    text-align: right;
  }

  .summary-item {
    margin-bottom: var(--space-2);
  }

  .summary-label {
    font-size: var(--text-xs);
    font-weight: var(--font-medium);
    color: var(--color-text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: var(--space-1);
  }

  .summary-value {
    font-size: var(--text-base);
    font-weight: var(--font-semibold);
    color: var(--color-text-primary);
  }

  /* Modern Items Section Styles */
  .items-section {
    margin-bottom: var(--space-8);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .section-title {
    font-size: var(--text-2xl);
    font-weight: var(--font-bold);
    color: var(--color-text-primary);
    margin: 0;
  }

  .section-meta {
    display: flex;
    align-items: center;
    gap: var(--space-4);
  }

  .items-count {
    font-size: var(--text-sm);
    color: var(--color-text-tertiary);
    background: var(--color-bg-accent);
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-md);
    font-weight: var(--font-medium);
  }

  .page-indicator {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    background: var(--color-bg-tertiary);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    font-weight: var(--font-medium);
  }

  .items-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .item-card {
    border: 1px solid var(--color-border-light);
    border-radius: var(--radius-md);
    background: var(--color-bg-secondary);
    overflow: hidden;
    transition: all 0.2s ease;
  }

  .item-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: var(--space-4) var(--space-6);
    background: var(--color-bg-primary);
  }

  .item-main {
    flex: 1;
  }

  .item-name {
    font-size: var(--text-lg);
    font-weight: var(--font-semibold);
    color: var(--color-text-primary);
    margin: 0 0 var(--space-2) 0;
  }

  .item-description {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    margin: 0;
    line-height: 1.4;
  }

  .item-total-display {
    text-align: right;
  }

  .item-total-amount {
    font-size: var(--text-2xl);
    font-weight: var(--font-bold);
    color: var(--color-brand-primary);
  }

  .item-details {
    padding: var(--space-4) var(--space-6);
    border-top: 1px solid var(--color-border-light);
  }

  .detail-row {
    display: flex;
    gap: var(--space-8);
    flex-wrap: wrap;
  }

  .detail-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    min-width: 120px;
  }

  .detail-group .detail-label {
    font-size: var(--text-xs);
    font-weight: var(--font-medium);
    color: var(--color-text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .detail-group .detail-value {
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: var(--color-text-primary);
  }

  .discount-info .detail-value {
    color: var(--color-success);
  }

  .page-continuation {
    margin-top: var(--space-6);
    padding-top: var(--space-4);
    border-top: 1px solid var(--color-border-light);
  }

  .continuation-indicator {
    text-align: center;
  }

  .continuation-text {
    font-size: var(--text-sm);
    color: var(--color-text-tertiary);
    font-weight: var(--font-medium);
    margin-bottom: var(--space-3);
  }

  .continuation-progress {
    height: 4px;
    background: var(--color-bg-accent);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .progress-bar {
    height: 100%;
    background: var(--color-brand-accent);
    transition: width 0.3s ease;
  }

  /* Modern Financial Summary Styles */
  .financial-summary {
    margin-bottom: var(--space-8);
  }

  .summary-content {
    max-width: 400px;
    margin-left: auto;
  }

  .summary-lines {
    margin-bottom: var(--space-6);
  }

  .summary-line {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-3);
  }

  .summary-line .summary-label {
    font-size: var(--text-base);
    color: var(--color-text-secondary);
    font-weight: var(--font-normal);
  }

  .summary-line .summary-amount {
    font-size: var(--text-base);
    font-weight: var(--font-medium);
    color: var(--color-text-primary);
    font-variant-numeric: tabular-nums;
  }

  .summary-divider {
    height: 2px;
    background: var(--color-border-default);
    margin: var(--space-6) 0;
    border-radius: var(--radius-sm);
  }

  .total-section {
    background: var(--color-bg-accent);
    padding: var(--space-5);
    border-radius: var(--radius-md);
  }

  .total-line {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-3);
  }

  .total-label {
    font-size: var(--text-lg);
    font-weight: var(--font-semibold);
    color: var(--color-text-primary);
  }

  .total-amount {
    font-size: var(--text-3xl);
    font-weight: var(--font-bold);
    color: var(--color-brand-primary);
    font-variant-numeric: tabular-nums;
  }

  .balance-line {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: var(--space-3);
    border-top: 1px solid var(--color-border-light);
  }

  .balance-label {
    font-size: var(--text-base);
    font-weight: var(--font-medium);
    color: var(--color-text-secondary);
  }

  .balance-amount {
    font-size: var(--text-xl);
    font-weight: var(--font-bold);
    font-variant-numeric: tabular-nums;
  }

  .balance-amount.outstanding {
    color: var(--color-danger);
  }

  .balance-amount.paid {
    color: var(--color-success);
  }

  .doc-type-badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
  }

  .doc-type-badge.quote {
    background: #dbeafe;
    color: #1d4ed8;
  }

  .doc-type-badge.invoice {
    background: #ecfdf5;
    color: #059669;
  }

  .doc-title {
    font-size: 28px;
    font-weight: 700;
    margin-bottom: 16px;
    color: var(--color-text);
  }

  .meta-table {
    margin-bottom: 16px;
  }

  .meta-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
    min-height: 18px;
  }

  .meta-row.total-row,
  .meta-row.balance-row {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--color-border);
    font-weight: 600;
  }

  .meta-label {
    font-size: 11px;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 500;
  }

  .meta-value {
    font-weight: 500;
    color: var(--color-text);
  }

  .total-amount,
  .balance-amount {
    font-size: 14px;
    font-weight: 700;
  }

  .balance-amount.outstanding {
    color: var(--color-danger);
  }

  .balance-amount.paid {
    color: var(--color-success);
  }

  .status-badge {
    display: inline-block;
    padding: 6px 12px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .status-badge.paid {
    background: #dcfce7;
    color: #166534;
  }

  .status-badge.pending {
    background: #fef3c7;
    color: #92400e;
  }

  .status-badge.overdue {
    background: #fee2e2;
    color: #991b1b;
  }

  .status-badge.accepted {
    background: #dcfce7;
    color: #166534;
  }

  .status-badge.declined {
    background: #fee2e2;
    color: #991b1b;
  }

  /* Improved Header Layout */
  .header-grid-improved {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 40px;
    align-items: start;
  }

  .business-section {
    display: flex;
    flex-direction: column;
  }

  .logo-and-details {
    display: flex;
    align-items: flex-start;
    gap: 16px;
  }

  .business-logo-horizontal {
    max-width: 100px;
    max-height: 80px;
    object-fit: contain;
    flex-shrink: 0;
  }

  .business-logo-placeholder-horizontal {
    width: 70px;
    height: 70px;
    background: var(--color-primary);
    color: white;
    border-radius: var(--border-radius);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 20px;
    flex-shrink: 0;
  }

  .business-info {
    flex: 1;
    min-width: 0;
  }

  .business-name {
    font-size: 18px;
    font-weight: 700;
    margin-bottom: 6px;
    color: var(--color-text);
  }

  .business-details-compact {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .detail-item {
    font-size: 11px;
    color: var(--color-text-muted);
    line-height: 1.3;
  }

  .document-section {
    text-align: right;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }

  .doc-title-improved {
    font-size: 32px;
    font-weight: 700;
    margin-bottom: 20px;
    color: var(--color-text);
    line-height: 1;
  }

  .meta-information {
    margin-bottom: 16px;
    min-width: 200px;
  }

  .status-badge-improved {
    display: inline-block;
    padding: 8px 16px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-top: 8px;
  }

  .status-badge-improved.paid {
    background: #dcfce7;
    color: #166534;
    border: 1px solid #bbf7d0;
  }

  .status-badge-improved.pending {
    background: #fef3c7;
    color: #92400e;
    border: 1px solid #fde68a;
  }

  .status-badge-improved.overdue {
    background: #fee2e2;
    color: #991b1b;
    border: 1px solid #fca5a5;
  }

  .status-badge-improved.accepted {
    background: #dcfce7;
    color: #166534;
    border: 1px solid #bbf7d0;
  }

  .status-badge-improved.declined {
    background: #fee2e2;
    color: #991b1b;
    border: 1px solid #fca5a5;
  }

  /* Client Section */
  .client-section {
    margin-bottom: 30px;
  }

  .section-card {
    background: var(--color-background-soft);
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius);
    padding: 20px;
  }

  .card-title {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--color-text-muted);
    margin: 0 0 12px 0;
  }

  .client-name {
    font-size: 18px;
    font-weight: 700;
    margin-bottom: 12px;
    color: var(--color-text);
  }

  .client-meta {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 8px;
  }

  .meta-item {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
  }

  .meta-item .meta-label {
    color: var(--color-text-muted);
  }

  .meta-item .meta-value {
    font-weight: 500;
    color: var(--color-text);
  }

  .amount-due {
    color: var(--color-danger);
    font-weight: 600;
  }

  .amount-paid {
    color: var(--color-success);
    font-weight: 600;
  }

  /* Line Items */
  .line-items-section {
    margin-bottom: 30px;
  }

  .items-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .section-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text);
    margin: 0;
  }

  .page-indicator {
    font-size: 11px;
    color: var(--color-text-muted);
    padding: 4px 8px;
    background: var(--color-background-soft);
    border-radius: var(--border-radius-sm);
  }

  .items-table {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius);
    overflow: hidden;
  }

  .items-table colgroup col.col-name { width: 22%; }
  .items-table colgroup col.col-description { width: 32%; }
  .items-table colgroup col.col-quantity { width: 8%; }
  .items-table colgroup col.col-unit { width: 8%; }
  .items-table colgroup col.col-unit-price { width: 12%; }
  .items-table colgroup col.col-discount { width: 8%; }
  .items-table colgroup col.col-total { width: 10%; }

  .items-table thead {
    display: table-header-group;
  }

  .items-table thead th {
    background: #f8fafc;
    border-bottom: 2px solid var(--color-border-strong);
    padding: 12px 10px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--color-text-muted);
    text-align: left;
  }

  .items-table thead th:nth-child(n+3) {
    text-align: right;
  }

  .items-table tbody tr {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .items-table tbody tr:nth-child(even) {
    background: var(--color-background-soft);
  }

  .items-table tbody td {
    padding: 12px 10px;
    border-bottom: 1px solid var(--color-border);
    vertical-align: top;
  }

  .item-name {
    font-weight: 500;
    color: var(--color-text);
  }

  .item-description {
    color: var(--color-text-muted);
    font-size: 11px;
    line-height: 1.3;
  }

  .item-quantity,
  .item-unit-price,
  .item-discount,
  .item-total {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .item-unit {
    color: var(--color-text-muted);
    font-size: 11px;
  }

  .page-continuation {
    margin-top: 16px;
    text-align: center;
    padding: 12px;
    background: var(--color-background-soft);
    border-radius: var(--border-radius);
  }

  .continuation-text {
    font-size: 11px;
    color: var(--color-text-muted);
    font-style: italic;
  }

  /* Financial Summary */
  .financial-summary {
    margin-bottom: 30px;
    display: flex;
    justify-content: flex-end;
  }

  .summary-table-container {
    min-width: 280px;
  }

  .summary-table {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius);
    overflow: hidden;
  }

  .summary-table tbody td {
    padding: 10px 16px;
    border-bottom: 1px solid var(--color-border);
  }

  .summary-table tbody tr:last-child td {
    border-bottom: none;
  }

  .summary-table .total-row td {
    font-weight: 700;
    font-size: 14px;
    background: var(--color-background-soft);
    border-top: 2px solid var(--color-border-strong);
  }

  .summary-table .balance-row td {
    font-weight: 700;
    font-size: 14px;
  }

  .summary-table .balance-row .summary-amount.outstanding {
    color: var(--color-danger);
  }

  .summary-table .balance-row .summary-amount.paid {
    color: var(--color-success);
  }

  .summary-label {
    color: var(--color-text-muted);
  }

  .summary-amount {
    text-align: right;
    font-variant-numeric: tabular-nums;
    color: var(--color-text);
  }

  /* Payment Section */
  .payment-section {
    margin-bottom: 30px;
  }

  .payment-methods {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 20px;
  }

  .payment-method {
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius);
    padding: 20px;
  }

  .method-title {
    font-size: 14px;
    font-weight: 600;
    margin: 0 0 12px 0;
    color: var(--color-text);
  }

  .bank-details {
    margin-bottom: 12px;
  }

  .bank-detail {
    font-size: 11px;
    margin-bottom: 4px;
    color: var(--color-text);
  }

  .payment-note {
    font-size: 10px;
    color: var(--color-text-muted);
    padding: 8px 12px;
    background: var(--color-background-soft);
    border-radius: var(--border-radius-sm);
  }

  .online-payment {
    text-align: center;
  }

  .online-description {
    font-size: 11px;
    color: var(--color-text-muted);
    margin-bottom: 16px;
  }

  .payment-button {
    display: inline-block;
    background: var(--color-primary);
    color: white;
    text-decoration: none;
    padding: 12px 24px;
    border-radius: var(--border-radius);
    font-weight: 600;
    font-size: 12px;
    transition: background-color 0.2s;
  }

  .payment-button:hover {
    background: #1d4ed8;
  }

  /* Terms Section */
  .terms-section {
    margin-bottom: 20px;
  }

  .custom-terms {
    margin-bottom: 16px;
    padding: 16px;
    background: var(--color-background-soft);
    border-radius: var(--border-radius);
    font-size: 11px;
    line-height: 1.4;
  }

  .terms-separator {
    height: 1px;
    background: var(--color-border);
    margin: 16px 0;
  }

  .standard-terms {
    font-size: 10px;
    color: var(--color-text-muted);
    line-height: 1.4;
  }

  .term-item {
    margin-bottom: 4px;
  }

  /* Page Footer */
  .page-footer {
    margin-top: 30px;
    padding-top: 16px;
    border-top: 1px solid var(--color-border);
  }

  .footer-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 10px;
    color: var(--color-text-muted);
  }

  .footer-left {
    display: flex;
    gap: 16px;
  }

  .document-ref {
    font-weight: 500;
  }

  .document-total {
    font-weight: 600;
    color: var(--color-text);
  }

  .page-numbers {
    font-weight: 500;
  }

  /* Print Optimizations */
  @media print {
    .document-container {
      max-width: none;
    }

    .page-continuation,
    .page-indicator {
      display: block !important;
    }

    .items-table thead {
      display: table-header-group !important;
    }

    .payment-button {
      border: 1px solid var(--color-primary);
      background: white !important;
      color: var(--color-primary) !important;
    }
  }

  /* Modern Payment & Footer Styles */
  .payment-methods-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: var(--space-6);
  }

  .payment-card {
    border: 1px solid var(--color-border-light);
    border-radius: var(--radius-lg);
    background: var(--color-bg-primary);
    overflow: hidden;
  }

  .payment-card-header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-5);
    background: var(--color-bg-secondary);
    border-bottom: 1px solid var(--color-border-light);
  }

  .payment-icon {
    font-size: var(--text-3xl);
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-brand-light);
    border-radius: var(--radius-lg);
  }

  .payment-title {
    font-size: var(--text-xl);
    font-weight: var(--font-semibold);
    color: var(--color-text-primary);
    margin: 0;
  }

  .payment-card-body {
    padding: var(--space-5);
  }

  .payment-amount-badge {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    background: var(--color-brand-light);
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-lg);
  }

  .badge-label {
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: var(--color-brand-primary);
  }

  .badge-amount {
    font-size: var(--text-lg);
    font-weight: var(--font-bold);
    color: var(--color-brand-primary);
  }

  .bank-details-grid {
    margin-bottom: var(--space-5);
  }

  .bank-detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-2) 0;
    border-bottom: 1px solid var(--color-border-light);
  }

  .bank-detail-row:last-child {
    border-bottom: none;
  }

  .bank-detail-row.single {
    justify-content: flex-start;
  }

  .bank-label {
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: var(--color-text-tertiary);
  }

  .bank-value {
    font-size: var(--text-base);
    font-weight: var(--font-medium);
    color: var(--color-text-primary);
  }

  .payment-note {
    display: flex;
    gap: var(--space-3);
    padding: var(--space-4);
    background: var(--color-info-light);
    border-radius: var(--radius-md);
    border-left: 4px solid var(--color-info);
  }

  .note-icon {
    font-size: var(--text-lg);
    flex-shrink: 0;
  }

  .note-text {
    font-size: var(--text-sm);
    line-height: 1.4;
    color: var(--color-text-secondary);
  }

  .payment-button-modern {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: var(--space-4) var(--space-6);
    background: var(--color-brand-primary);
    color: var(--color-text-inverse);
    text-decoration: none;
    border-radius: var(--radius-lg);
    font-weight: var(--font-semibold);
    box-shadow: var(--shadow-sm);
  }

  .modern-footer {
    margin-top: var(--space-16);
    padding-top: var(--space-8);
    border-top: 2px solid var(--color-brand-primary);
  }

  .footer-content-modern {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--space-6);
  }

  .footer-branding {
    display: flex;
    align-items: center;
    gap: var(--space-4);
  }

  .footer-logo {
    width: 40px;
    height: 40px;
    background: var(--color-brand-primary);
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .brand-mark {
    font-size: var(--text-lg);
    font-weight: var(--font-bold);
    color: var(--color-text-inverse);
  }

  .footer-tagline {
    text-align: center;
    font-size: var(--text-sm);
    color: var(--color-text-tertiary);
    font-weight: var(--font-medium);
  }

  /* Enhanced Pagination Controls */
  ${generatePageBreakCSS()}
`;

// Function to generate complete HTML with measurement script
export function generateEnhancedPDFHtml(content: string, title: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
        <style>
          ${baseStyles}
        </style>
      </head>
      <body>
        <div class="document-container">
          ${content}
        </div>
        <script>
          ${generateContentMeasurementScript()}
        </script>
      </body>
    </html>
  `;
}

