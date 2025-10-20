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

**Strategy:** Big architectural moves first, then add polish layers.

1. **Database Access** ⚠️ - Move queries to services (Architecture)
2. **Service Layer** ⚠️ - Structure service code (Architecture)
3. **Error Handling** - Add typed errors (Foundation)
4. **Type Organization** - Standardize all types (Foundation)
5. **API Response Format** - Standard envelope (Foundation)
6. **Validation** - Zod schema patterns (Pattern)
7. **Authentication** - Auth helper standardization (Pattern)
8. **Logging** - Structured logging (Quality)
9. **Import Organization** - Import order (Quality)
10. **File Naming** - Rename files (Quality)

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

**None started yet** - Begin with Phase 1: Database Access ⚠️

## Phase Status

- [ ] Phase 1: Database Access ⚠️ (Architecture)
- [ ] Phase 2: Service Layer ⚠️ (Architecture)
- [ ] Phase 3: Error Handling (Foundation)
- [ ] Phase 4: Type Organization (Foundation)
- [ ] Phase 5: API Response Format (Foundation)
- [ ] Phase 6: Validation (Pattern)
- [ ] Phase 7: Authentication (Pattern)
- [ ] Phase 8: Logging (Quality)
- [ ] Phase 9: Import Organization (Quality)
- [ ] Phase 10: File Naming (Quality)

---

**Last Updated:** 2025-10-20
