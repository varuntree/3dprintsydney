# Cleaning Workspace

This folder contains the workspace for each cleanup phase.

## Structure

Each phase has its own directory:

```
cleaning/
├── 01-error-handling/
│   ├── workspace.md      # Current status and progress
│   ├── PLAN.md          # Implementation plan
│   └── findings/        # Explore agent findings
├── 02-type-organization/
│   ├── workspace.md
│   ├── PLAN.md
│   └── findings/
├── 03-api-responses/
├── 04-database-access/
├── 05-service-layer/
├── 06-authentication/
├── 07-validation/
├── 08-logging/
├── 09-import-organization/
└── 10-file-naming/
```

## Phase Order (Execute in Order)

1. **Error Handling** - Foundation for all error handling
2. **Type Organization** - Standardize all types
3. **API Response Format** - Standard response envelope
4. **Database Access** - Services-only pattern
5. **Service Layer** - Business logic organization
6. **Authentication** - Auth helper standardization
7. **Validation** - Zod schema patterns
8. **Logging** - Structured logging
9. **Import Organization** - Import order
10. **File Naming** - Rename files to conventions

## How to Use

1. **Start a phase:**
   - Create phase directory (e.g., `01-error-handling/`)
   - Copy `WORKSPACE_TEMPLATE.md` to `workspace.md`
   - Follow instructions in `/documentation/patterns/INDEX.md`

2. **During phase:**
   - Update `workspace.md` with progress
   - Create `PLAN.md` after exploration
   - Save agent findings in `findings/` folder

3. **Complete phase:**
   - Mark all checkboxes in `workspace.md`
   - Ensure build passes
   - Commit changes
   - Move to next phase

## Current Phase

**None started yet** - Begin with Phase 1: Error Handling

## Phase Status

- [ ] Phase 1: Error Handling
- [ ] Phase 2: Type Organization
- [ ] Phase 3: API Response Format
- [ ] Phase 4: Database Access
- [ ] Phase 5: Service Layer
- [ ] Phase 6: Authentication
- [ ] Phase 7: Validation
- [ ] Phase 8: Logging
- [ ] Phase 9: Import Organization
- [ ] Phase 10: File Naming

---

**Last Updated:** 2025-10-20
