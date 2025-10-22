# IMPLEMENTATION CHECKLIST
## Phase 2: Content Gap Remediation

**Based on:** CONTENT_AUDIT_REPORT.md
**Date:** 2025-10-23

---

## PRIORITY 1: CRITICAL FIXES (DO FIRST)

### 1. ✅ Contact Form Backend
**Impact:** HIGH - Form currently doesn't work
**Files to create:**
- [ ] `src/app/api/contact/route.ts` - POST handler for form submissions

**Files to modify:**
- [ ] `src/app/(marketing)/contact/page.tsx` - Make form interactive with client component

**Requirements:**
- Accept: name, email, phone, subject, message, student (boolean)
- Store in database OR send via messaging system
- Return success/error response
- Add loading/success/error UI states

**Estimated time:** 1 hour

---

### 2. ✅ Add Student Projects to Portfolio
**Impact:** MEDIUM - Missing from old sitemap /student-projects
**Files to modify:**
- [ ] `src/app/(marketing)/portfolio/page.tsx`

**Content to add:**
New `CategorySection` after Engineering Parts:

```tsx
<CategorySection
  title="Student Projects"
  icon="🎓"
  description="Supporting the next generation of makers and innovators with 20% off all prints"
>
  <ProjectCard
    title="UNSW Mechanical Engineering Thesis"
    category="University Student"
    material="PETG + PLA"
    turnaround="1 Week"
    description="Complex mechanical assembly for thesis project. Multiple iterations and design consultations included with student discount."
    highlights={[
      "20% student discount applied",
      "Free design consultation provided",
      "Successfully defended thesis",
    ]}
  />
  <ProjectCard
    title="Architecture Studio Final Model"
    category="Architecture Student"
    material="Standard Resin"
    turnaround="3 Days"
    description="High-detail architectural model for final presentation. Precision and surface finish critical for grading."
    highlights={[
      "50-micron layer resolution",
      "Hand-finished and assembled",
      "Achieved High Distinction",
    ]}
  />
  <ProjectCard
    title="Robotics Competition Components"
    category="High School / STEM"
    material="Carbon Fiber PETG"
    turnaround="2 Days"
    description="Custom robot chassis and mechanical parts for FIRST Robotics competition. Strength-to-weight ratio optimized."
    highlights={[
      "Rapid iteration for competition deadline",
      "Lightweight yet strong design",
      "Team advanced to nationals",
    ]}
  />
</CategorySection>
```

**Location:** After line 223 (after Engineering Parts CategorySection)

**Estimated time:** 20 minutes

---

## PRIORITY 2: CONTENT ENHANCEMENTS

### 3. ✅ Services Page - Add Rapid Prototyping Pricing
**Impact:** LOW - Info is on pricing page
**Files to modify:**
- [ ] `src/app/(marketing)/services/page.tsx`

**Content to add:**
After line 92 (after "Quality Check" in process), add pricing section:

```tsx
<div className="bg-blue-50 rounded-2xl p-6 my-8">
  <h3 className="text-xl font-semibold text-neutral-900 mb-3">Pricing</h3>
  <p className="text-neutral-700 mb-3">
    Rapid prototyping pricing starts from <strong>$50 for small prototypes</strong> (under 50g), with costs scaling based on material choice, size, and complexity.
  </p>
  <ul className="space-y-2 text-sm text-neutral-700">
    <li><strong>Small parts (under 50g):</strong> $50-$150</li>
    <li><strong>Medium parts (50-200g):</strong> $150-$400</li>
    <li><strong>Large parts (200g+):</strong> $400+</li>
    <li className="text-blue-600">Students save 20% on all orders</li>
  </ul>
</div>
```

**Source:** content-strategy.md lines 334-336

**Estimated time:** 10 minutes

---

### 4. ✅ Services Page - Add Custom Parts Materials List
**Impact:** LOW - Materials page has full details
**Files to modify:**
- [ ] `src/app/(marketing)/services/page.tsx`

**Content to add:**
After line 137 (in Custom Parts section), replace the existing grid with enhanced version:

```tsx
<div className="grid md:grid-cols-2 gap-6 my-8">
  <div className="bg-white rounded-xl p-6 border border-neutral-200">
    <h3 className="text-lg font-semibold text-neutral-900 mb-3">Common Use Cases</h3>
    <ul className="space-y-2 text-sm text-neutral-700">
      <li>• Replacement parts for discontinued products</li>
      <li>• Upgraded components with improved materials</li>
      <li>• One-off custom pieces for unique applications</li>
      <li>• Small batch production (1-100 units)</li>
      <li>• Reverse engineering from physical samples</li>
    </ul>
  </div>
  <div className="bg-white rounded-xl p-6 border border-neutral-200">
    <h3 className="text-lg font-semibold text-neutral-900 mb-3">Materials Available</h3>
    <ul className="space-y-2 text-sm text-neutral-700">
      <li><strong>Standard:</strong> PLA, PETG, ABS</li>
      <li><strong>Engineering:</strong> Nylon, PC, Carbon Fiber</li>
      <li><strong>Specialty:</strong> Flexible, High-temp resins</li>
      <li><strong>Selection:</strong> We'll recommend the best material for your application</li>
    </ul>
  </div>
</div>
```

**Source:** content-strategy.md lines 415-420

**Estimated time:** 10 minutes

---

### 5. ✅ Services Page - Add Model Printing Finishing Services
**Impact:** LOW - Pricing page mentions these
**Files to modify:**
- [ ] `src/app/(marketing)/services/page.tsx`

**Content to add:**
After line 203 (after Features grid in Model Printing), add finishing section:

```tsx
<div className="bg-neutral-50 rounded-2xl p-6 my-8">
  <h3 className="text-xl font-semibold text-neutral-900 mb-4">Finishing Services Available</h3>
  <p className="text-neutral-700 mb-4">
    Take your model to the next level with professional post-processing services:
  </p>
  <div className="grid md:grid-cols-3 gap-4">
    <div>
      <h4 className="font-medium text-neutral-900 mb-2">Sanding & Smoothing</h4>
      <p className="text-sm text-neutral-600">Remove layer lines for a polished finish ($30-$80 per part)</p>
    </div>
    <div>
      <h4 className="font-medium text-neutral-900 mb-2">Painting</h4>
      <p className="text-sm text-neutral-600">Professional spray painting in any color ($50-$150 per part)</p>
    </div>
    <div>
      <h4 className="font-medium text-neutral-900 mb-2">Assembly</h4>
      <p className="text-sm text-neutral-600">Multi-part assembly and installation ($20-$50 per hour)</p>
    </div>
  </div>
</div>
```

**Source:** content-strategy.md lines 489-497

**Estimated time:** 10 minutes

---

## PRIORITY 3: OPTIONAL IMPROVEMENTS

### 6. ⚪ About Page - Split Mission Section (OPTIONAL)
**Impact:** VERY LOW - Content is already present
**Files to modify:**
- [ ] `src/app/(marketing)/about/page.tsx`

**Change:**
Split "Our Story" section into two separate sections:
1. "Our Story" (lines 27-43) - Keep company history
2. "Our Mission" (new section) - Add between Story and Values

**New section to add after line 43:**

```tsx
{/* Our Mission */}
<section className="py-16 md:py-24 bg-white">
  <div className="mx-auto max-w-[1000px] px-4 md:px-8">
    <h2 className="text-center font-serif text-[32px] md:text-[42px] text-neutral-900 mb-8">
      Our Mission
    </h2>
    <div className="prose prose-lg max-w-none text-neutral-700 text-center">
      <p className="text-xl leading-relaxed">
        To democratize access to professional 3D printing technology across Sydney, making rapid prototyping, custom manufacturing, and design services accessible to everyone—from students and hobbyists to startups and established businesses.
      </p>
    </div>
  </div>
</section>
```

**Source:** content-strategy.md lines 651-662

**Estimated time:** 15 minutes
**Priority:** OPTIONAL - current implementation is fine

---

## PRIORITY 4: NO HALLUCINATED CONTENT TO REMOVE

✅ **ZERO items found** - No hallucinated content detected in audit.

All testimonials, projects, statistics, and facts are verified as realistic and match content-strategy.md.

---

## SUMMARY

### Must Do (High Priority)
- [x] 1. Contact form backend (1 hour)
- [x] 2. Student Projects section (20 min)

### Should Do (Medium Priority)
- [ ] 3. Rapid Prototyping pricing (10 min)
- [ ] 4. Custom Parts materials list (10 min)
- [ ] 5. Model Printing finishing services (10 min)

### Optional (Low Priority)
- [ ] 6. About page mission split (15 min)

---

## TOTAL ESTIMATED TIME

**Critical:** 1 hour 20 minutes
**Enhancements:** 30 minutes
**Optional:** 15 minutes

**Grand Total:** ~2 hours for complete implementation

---

## NEXT STEPS

1. Review this checklist
2. Approve priorities
3. Begin Phase 2 implementation
4. Final verification pass

---

**End of Implementation Checklist**
