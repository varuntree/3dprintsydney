# 3D Print Sydney - Centralized Design System

This document describes the centralized design system implementation for the 3D Print Sydney application. All design tokens, colors, and styling utilities are defined in one place for consistency.

---

## 📁 File Structure

```
src/
├── styles/
│   └── tokens.css          # ⭐ All design tokens (colors, spacing, typography, etc.)
├── lib/
│   └── design-system.ts    # ⭐ TypeScript utilities for status, tones, colors
└── app/
    └── globals.css         # Tailwind imports + theme mapping
```

---

## 🎨 Design Token System

### Color Palette

All colors are defined in `src/styles/tokens.css` as CSS custom properties.

#### **Ramp-Inspired Base Colors**

```css
--color-navy-dark: #0B0F1E          /* Primary dark background */
--color-navy-medium: #1A1F35        /* Secondary dark background */
--color-lime: #CDFF00               /* Primary accent (CTAs, focus) */
--color-lime-hover: #B8E600         /* Lime hover state */
--color-lime-dark: #A3CC00          /* Lime active state */
```

#### **Neutral Grays**

```css
--color-gray-50: #F8F9FA
--color-gray-100: #F1F3F5
--color-gray-200: #E9ECEF          /* Borders, inputs */
--color-gray-300: #DEE2E6          /* Placeholder text */
--color-gray-500: #6C757D          /* Secondary text */
--color-gray-700: #495057          /* Body text */
--color-gray-900: #212529          /* Headings */
```

#### **Semantic Status Colors** (Centralized)

All status colors are defined once and reused everywhere:

| Status Type | Base Color | Background | Border | Usage |
|------------|-----------|-----------|---------|-------|
| **Success** | `--color-success` (#10B981) | `--color-success-bg` | `--color-success-border` | Paid, Completed, Active |
| **Warning** | `--color-warning` (#F59E0B) | `--color-warning-bg` | `--color-warning-border` | Pending, Draft, Overdue |
| **Danger** | `--color-danger` (#EF4444) | `--color-danger-bg` | `--color-danger-border` | Failed, Declined, Cancelled |
| **Info** | `--color-info` (#3B82F6) | `--color-info-bg` | `--color-info-border` | Converted, Processed, Sent |
| **Neutral** | `--color-neutral` (#64748B) | `--color-neutral-bg` | `--color-neutral-border` | Default, Unknown |

---

## 🛠️ Using the Design System

### Status Badges

**Always use the centralized utilities** from `src/lib/design-system.ts`:

```typescript
import { StatusBadge } from "@/components/ui/status-badge";

// Automatically maps status to correct color
<StatusBadge status="paid" />         // Green
<StatusBadge status="pending" />      // Amber
<StatusBadge status="declined" />     // Red
```

#### How it works:

```typescript
// lib/design-system.ts
export function getStatusType(status: string): StatusType {
  // Maps "PAID", "paid", "Paid" → "success"
  // Returns: "success" | "warning" | "danger" | "info" | "neutral"
}

export function getStatusBadgeClasses(statusType: StatusType): string {
  // Returns centralized Tailwind classes using design tokens
  // Example: "border-[var(--color-success-border)] bg-[var(--color-success-bg)]"
}
```

---

### Metric Cards with Tone System

The app uses a **centralized tone system** for metric cards and data visualization:

```typescript
import { MetricCard } from "@/components/ui/metric-card";

<MetricCard
  label="Revenue"
  value="$45,320"
  tone="emerald"    // emerald | sky | amber | slate
  helper="↑ 12% from last month"
/>
```

#### Available Tones

| Tone | Color | Usage |
|------|-------|-------|
| `emerald` | Green | Positive metrics, growth |
| `sky` | Blue | Information, neutral data |
| `amber` | Yellow/Orange | Warnings, attention |
| `slate` | Gray | Default, secondary metrics |

All tone configurations are centralized in:

```typescript
// lib/design-system.ts
export const TONE_CONFIGS: Record<ToneType, ToneConfig> = {
  emerald: {
    border: "border-[var(--tone-emerald-border)]",
    pill: "bg-[var(--tone-emerald-pill-bg)] text-[var(--tone-emerald-pill-text)]",
    gradient: "from-[var(--tone-emerald-bg)] ...",
    value: "text-[var(--tone-emerald-value)]",
  },
  // ... other tones
};
```

---

## 🎯 Best Practices

### ✅ DO

```typescript
// Use semantic design tokens
<div className="bg-[var(--color-success-bg)] border-[var(--color-success-border)]">

// Use centralized utilities
const statusType = getStatusType("paid");
const classes = getStatusBadgeClasses(statusType);

// Use MetricCard component
<MetricCard tone="emerald" value="$1000" label="Revenue" />
```

### ❌ DON'T

```typescript
// Don't hardcode Tailwind colors
<div className="bg-emerald-50 border-emerald-200">  // ❌

// Don't duplicate status logic
if (status === "paid") return "text-emerald-600";   // ❌

// Don't create inline style objects
const styles = { border: "border-emerald-200" };    // ❌
```

---

## 📐 Typography Scale

```css
--text-xs: 0.75rem      /* 12px - Labels, captions */
--text-sm: 0.875rem     /* 14px - Small text */
--text-base: 1rem       /* 16px - Body text */
--text-lg: 1.125rem     /* 18px - Large body */
--text-xl: 1.25rem      /* 20px - Card headings */
--text-2xl: 1.5rem      /* 24px - Small headings */
--text-3xl: 1.875rem    /* 30px - Section headings */
--text-4xl: 2.25rem     /* 36px - Page headings */
```

**Font Weights:**
```css
--font-normal: 400
--font-medium: 500
--font-semibold: 600
--font-bold: 700
```

---

## 📏 Spacing Scale

```css
--space-1: 0.25rem     /* 4px */
--space-2: 0.5rem      /* 8px */
--space-3: 0.75rem     /* 12px */
--space-4: 1rem        /* 16px */
--space-6: 1.5rem      /* 24px */
--space-8: 2rem        /* 32px */
--space-12: 3rem       /* 48px */
--space-16: 4rem       /* 64px */
```

---

## 🔲 Border Radius

```css
--radius-sm: 0.375rem   /* 6px */
--radius-md: 0.5rem     /* 8px */
--radius-lg: 0.75rem    /* 12px */
--radius-xl: 1rem       /* 16px */
--radius-2xl: 1.5rem    /* 24px */
--radius-3xl: 1.875rem  /* 30px */
--radius-full: 9999px   /* Fully rounded */
```

---

## 🎭 Shadows

```css
--shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.05)
--shadow-sm: 0 2px 4px 0 rgba(0, 0, 0, 0.06)
--shadow-md: 0 4px 8px 0 rgba(0, 0, 0, 0.08)
--shadow-lg: 0 8px 16px 0 rgba(0, 0, 0, 0.10)
```

---

## 🌗 Dark Mode

All design tokens automatically adapt to dark mode via the `.dark` class:

```css
.dark {
  --background: var(--color-navy-dark);
  --foreground: var(--color-white);
  --card: var(--color-navy-medium);
  /* ... all tokens redefined for dark mode */
}
```

---

## 🔄 Status Mappings

Complete status-to-color mappings in `lib/design-system.ts`:

```typescript
export const STATUS_MAPPINGS = {
  // Success
  PAID: "success",
  COMPLETED: "success",
  ACTIVE: "success",
  ACCEPTED: "success",
  APPROVED: "success",

  // Warning
  PENDING: "warning",
  DRAFT: "warning",
  OVERDUE: "warning",
  MAINTENANCE: "warning",

  // Danger
  DECLINED: "danger",
  FAILED: "danger",
  CANCELLED: "danger",
  VOIDED: "danger",
  INACTIVE: "danger",

  // Info
  CONVERTED: "info",
  PROCESSED: "info",
  SENT: "info",

  // Neutral
  OFFLINE: "neutral",
};
```

---

## 📊 Chart Colors

Consistent chart colors for data visualization:

```typescript
export const CHART_COLORS: Record<string, string> = {
  PENDING: "var(--color-info)",      // Blue
  ACCEPTED: "var(--color-success)",  // Green
  CONVERTED: "#8B5CF6",              // Purple
  DECLINED: "var(--color-danger)",   // Red
  DRAFT: "var(--color-neutral)",     // Gray
};
```

---

## 🚀 Quick Reference

### Adding a New Status Color

1. **Add to `tokens.css`** (if new status type):
```css
--color-mynewstatus: #HEXCODE;
--color-mynewstatus-bg: #HEXCODE;
--color-mynewstatus-border: #HEXCODE;
```

2. **Add to `design-system.ts`**:
```typescript
export const STATUS_MAPPINGS = {
  // ... existing mappings
  MYNEWSTATUS: "success", // Map to existing semantic type
};
```

3. **Use immediately**:
```typescript
<StatusBadge status="mynewstatus" />  // ✅ Works!
```

### Customizing Tone Colors

Edit `tokens.css`:

```css
/* Customize emerald tone */
--tone-emerald-value: #YOUR_COLOR;
--tone-emerald-bg: #YOUR_BG;
--tone-emerald-border: #YOUR_BORDER;
```

All MetricCards using `tone="emerald"` will update automatically.

---

## ✅ Component Checklist

- ✅ `StatusBadge` - Uses centralized status colors
- ✅ `MetricCard` - Uses centralized tone system
- ⚠️ `dashboard-view.tsx` - Still has some hardcoded colors (refactor recommended)
- ⚠️ `printers-view.tsx` - Still has some hardcoded colors (refactor recommended)

---

## 🔍 Finding Hardcoded Colors

To find remaining hardcoded colors:

```bash
# Search for Tailwind color utilities
grep -r "text-emerald\|bg-amber\|border-sky" src/components/

# Search for hex colors
grep -r "#[0-9A-Fa-f]\{6\}" src/components/ --exclude-dir=node_modules
```

---

## 📝 Notes

- **Single Source of Truth**: All design decisions live in `tokens.css`
- **TypeScript Support**: Use `design-system.ts` utilities for type safety
- **Framework Agnostic**: CSS custom properties work in any framework
- **Performance**: CSS variables are browser-native and fast
- **Maintainability**: Change colors once, update everywhere

---

## 🛟 Support & Troubleshooting

### Colors not updating?

1. Check `tokens.css` is imported in `globals.css`
2. Verify Tailwind is configured to use arbitrary values: `bg-[var(--color-name)]`
3. Clear `.next` cache: `rm -rf .next && npm run dev`

### Build errors?

```bash
npm run build
```

All design tokens are validated at build time. Check console for errors.

---

**Last Updated**: 2025-01-XX
**Design System Version**: 1.0 (Ramp-Inspired)