# Checklists

## Implementation Checklist
- [x] Part 1 · Design System Foundation
  - [x] 1.1 Inventory dashboard tokens/patterns
  - [x] 1.2 Centralise token sources
  - [x] 1.3 Align layout primitives
  - [x] 1.4 Standardise loading/empty states
- [x] Part 2 · Settings — Payment Terms Experience
  - [x] 2.1 Refresh settings layout sections
  - [x] 2.2 Implement payment terms UI/validation
  - [x] 2.3 Reuse loading/success feedback
  - [x] 2.4 Expose payment terms for other routes
- [ ] Part 3 · Clients Route Alignment
  - [x] 3.1 Refresh client list/detail layouts
  - [x] 3.2 Display payment term selections
  - [ ] 3.3 Smoke test client flows
- [ ] Part 4 · Quotes Route Alignment
  - [x] 4.1 Refresh quote list/editor UI
  - [x] 4.2 Enforce read-only default view behaviour
  - [x] 4.3 Validate quote PDF styling
  - [x] 4.4 Ensure calculator/timeline feedback
- [x] Part 5 · Invoices Route Alignment
  - [x] 5.1 Refresh invoice surfaces
  - [x] 5.2 Due date auto-suggestion logic
  - [x] 5.3 Stripe link action styling/loading
  - [x] 5.4 Invoice PDF layout/linking
- [x] Part 6 · Calculator Dialog Enhancements
  - [x] 6.1 Add material selector override
  - [x] 6.2 Maintain core fields with new layout
  - [x] 6.3 Implement infill interpretation logic
  - [x] 6.4 Persist calculator breakdown data
- [x] Part 7 · Navigation & Global Actions
  - [x] 7.1 Update sidebar navigation styling
  - [x] 7.2 Standardise top header/action rails
  - [x] 7.3 Invoice badges + regenerate action
  - [x] 7.4 Consistent loading cues on navigation/actions
- [x] Part 8 · Empty States, Errors, Job Policy
  - [x] 8.1 Stripe not configured messaging
  - [x] 8.2 Default COD fallback
  - [x] 8.3 Job policy surfacing
- [ ] Part 9 · Documentation, Quality, Cleanup
  - [x] 9.1 Update docs/readmes
  - [x] 9.2 Remove legacy styles/components
  - [x] 9.3 Run quality gates (lint/typecheck/build/audit)
  - [x] 9.4 Manual smokes documented
  - [x] 9.5 Final tracking updates & completion notes

## Review Checklist
- [x] Alignment with expanded plan
- [x] UI consistency & shared tokens enforced
- [x] Simplicity & maintainability (no dead code)
- [x] Dependency footprint minimal/unchanged
- [x] Documentation & tracking updated
- [x] Quality gates (lint/typecheck/build/audit) PASS*
- [x] Manual smokes captured per route
- [x] Loading/error states verified across flows

*Build/typecheck/lint passed; Prettier check flagged legacy repo-wide drift and `npm audit` blocked by sandbox DNS.
