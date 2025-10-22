# Landing & Marketing Pages Implementation Plan

**Project:** 3D Print Sydney - Marketing Website Rebuild
**Start Date:** 2025-10-22
**Status:** In Progress

---

## Overview

Rebuild the marketing website by extracting content from the existing site (https://www.3dprintsydney.com/), modernizing the copy, and implementing with the provided component design patterns.

---

## Execution Phases

### ✅ Phase 1: Reconnaissance & Content Extraction
**Status:** PENDING
**Objective:** Fetch all content and assets from existing website

**Tasks:**
- [ ] Deploy Explore agent to discover all routes
- [ ] Deploy parallel agents to extract content from each page
- [ ] Collect all images and assets
- [ ] Analyze brand identity and messaging
- [ ] Document content inventory

**Deliverables:**
- `content-audit.md` - Complete content inventory
- `assets/` - Downloaded images and graphics
- `brand-analysis.md` - Brand colors, fonts, tone

---

### ✅ Phase 2: Content Strategy & Rewriting
**Status:** PENDING
**Objective:** Transform old content into modern, improved copy

**Tasks:**
- [ ] Audit and categorize extracted content
- [ ] Rewrite homepage content (hero, features, CTAs)
- [ ] Rewrite service/product descriptions
- [ ] Rewrite about/company content
- [ ] Rewrite pricing information
- [ ] Create new contact page content
- [ ] Process and optimize images

**Deliverables:**
- `content-strategy.md` - All rewritten content
- `assets/optimized/` - Optimized images

---

### ✅ Phase 3: Architecture Setup
**Status:** PENDING
**Objective:** Implement technical foundation

**Tasks:**
- [ ] Create `(marketing)` route group
- [ ] Build marketing layout with header/footer
- [ ] Update middleware for marketing routes
- [ ] Set up design tokens (colors, spacing, typography)
- [ ] Create base page structure

**Deliverables:**
- `src/app/(marketing)/layout.tsx`
- Updated `middleware.ts`
- Route structure created

---

### ✅ Phase 4: Component Library Creation
**Status:** PENDING
**Objective:** Build reusable marketing components

**Components:**
- [ ] `header.tsx` - Navigation with dropdowns
- [ ] `footer.tsx` - Footer with sitemap
- [ ] `hero.tsx` - Hero sections
- [ ] `feature-grid.tsx` - Feature showcases
- [ ] `service-card.tsx` - Service offerings
- [ ] `pricing-card.tsx` - Pricing tiers
- [ ] `testimonial.tsx` - Customer reviews
- [ ] `cta-section.tsx` - Call-to-action blocks
- [ ] `portfolio-card.tsx` - Project showcases
- [ ] `contact-form.tsx` - Contact form

**Deliverables:**
- `src/components/marketing/` - Complete component library

---

### ✅ Phase 5: Page Implementation
**Status:** PENDING
**Objective:** Build each marketing page

**Pages:**
- [ ] Landing page (`/`)
- [ ] Services page (`/services`)
- [ ] Pricing page (`/pricing`)
- [ ] Portfolio page (`/portfolio`)
- [ ] About page (`/about`)
- [ ] Contact page (`/contact`)

**Deliverables:**
- All marketing pages functional and styled

---

### ✅ Phase 6: Integration & Polish
**Status:** PENDING
**Objective:** Connect marketing site with existing app

**Tasks:**
- [ ] Integrate navigation (marketing ↔ app)
- [ ] Test mobile responsiveness
- [ ] Add cross-linking between pages
- [ ] Optimize assets (compress, lazy load)
- [ ] Add proper metadata (SEO)

**Deliverables:**
- Seamless user experience across marketing and app

---

### ✅ Phase 7: Quality Assurance
**Status:** PENDING
**Objective:** Final testing and validation

**Checklist:**
- [ ] All pages render correctly
- [ ] Mobile responsive (320px - 1920px)
- [ ] All CTAs work and lead to correct destinations
- [ ] Forms submit properly
- [ ] Images load and display correctly
- [ ] Navigation works across all pages
- [ ] Browser compatibility tested
- [ ] Performance check (load times)

**Deliverables:**
- Production-ready marketing website

---

## Design System

**Brand Colors (Existing):**
- Navy Dark: `#0B0F1E` (primary backgrounds)
- Lime Accent: `#CDFF00` (CTAs, highlights)
- White: `#FFFFFF` (light mode background)

**Adopted Patterns (From Provided Code):**
- Blue Gradient: `#0E5FFF` → `#0046FF` (for CTAs)
- Clean rounded corners (`radius-2xl: 1.25rem`)
- Modern spacing and typography
- Smooth hover states

**Merge Strategy:**
- Use blue gradient for primary CTAs (modern look)
- Keep navy + lime for brand consistency in headers/accents
- Modern, clean aesthetic throughout

---

## Technical Stack

**Framework:** Next.js 15 (App Router)
**Styling:** Tailwind CSS + Design Tokens
**Components:** shadcn/ui + custom marketing components
**Route Strategy:** Separate `(marketing)` route group

---

## Timeline

- Phase 1: ~45 minutes
- Phase 2: ~20 minutes
- Phase 3: ~15 minutes
- Phase 4: ~30 minutes
- Phase 5: ~90 minutes
- Phase 6: ~20 minutes
- Phase 7: ~15 minutes

**Total Estimated:** 3-4 hours

---

## Progress Tracking

**Last Updated:** 2025-10-22
**Current Phase:** Phase 1
**Completion:** 0%

---

## Notes

- All temporary assets stored in `/documentation/temp_landing/`
- Content extracted from: https://www.3dprintsydney.com/
- Design reference: Provided React components
- Content will be rewritten, not copied verbatim
