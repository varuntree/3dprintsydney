# Codebase Cleanup Process - Instructions for Agent

**Purpose:** Systematically clean and restructure the codebase according to approved patterns
**Goal:** Reduce entropy, achieve 100% consistency - NO functionality changes
**Critical:** NO regressions - all builds must pass after each phase

---

## Prerequisites

Before starting ANY cleanup work:

1. **Read these files in order:**
   - `/documentation/patterns/STANDARDS.md` - All approved patterns
   - `/documentation/SYSTEM_OVERVIEW.md` - Architecture overview
   - `/documentation/API_ARCHITECTURE.md` - API structure
   - `/documentation/DATABASE_SCHEMA.md` - Database structure
   - This file (INDEX.md) - Cleanup process

2. **Understand the constraints:**
   - ✅ Fix code organization and structure
   - ✅ Apply consistent patterns
   - ✅ Reduce code duplication
   - ✅ Improve type safety
   - ❌ DO NOT change functionality
   - ❌ DO NOT break existing features
   - ❌ DO NOT skip build verification

---

## Cleanup Phases (Execute in Order)

Each phase MUST be completed fully before moving to the next.

**Strategy:** Do big architectural moves first, then add polish layers on top.

### Phase 1: Database Access ⚠️ (Architecture)
**Why first:** Get architecture right - move code to correct layer

**Folder:** `/documentation/patterns/cleaning/01-database-access/`

**Changes:**
- Move ALL database queries from API routes to services
- Ensure NO API route queries database directly
- Remove all `getServiceSupabase()` calls from API routes
- Don't worry about perfection yet, just move code

**Impact:** CRITICAL - This restructures where database code lives

### Phase 2: Service Layer ⚠️ (Architecture)
**Why second:** Structure the moved code properly

**Folder:** `/documentation/patterns/cleaning/02-service-layer/`

**Changes:**
- Ensure all services follow standard structure
- Extract business logic from API routes to services
- Standardize service function signatures
- Add proper DTO mapping
- Clean up and organize service code

**Impact:** CRITICAL - Now all business logic is in the right place

### Phase 3: Error Handling (Foundation)
**Why third:** Add to already-structured services

**Folder:** `/documentation/patterns/cleaning/03-error-handling/`

**Files to create:**
- `lib/errors.ts` - Custom error classes
- Update all services to throw typed errors
- Update all API routes to catch typed errors

**Impact:** Foundation - Services and routes exist, now add proper errors

### Phase 4: Type Organization (Foundation)
**Why fourth:** Add to already-structured services

**Folder:** `/documentation/patterns/cleaning/04-type-organization/`

**Files to create:**
- `/lib/types/clients.ts`
- `/lib/types/invoices.ts`
- `/lib/types/quotes.ts`
- `/lib/types/jobs.ts`
- `/lib/types/common.ts`
- `/lib/types/index.ts`

**Impact:** Foundation - Services structured, now add proper types

### Phase 5: API Response Format (Foundation)
**Why fifth:** Routes are simple now, standardize responses

**Folder:** `/documentation/patterns/cleaning/05-api-responses/`

**Files to create:**
- `server/api/respond.ts` - success() and fail() helpers
- Update all API routes to use standard responses

**Impact:** Foundation - Routes just call services, standardize responses

### Phase 6: Validation (Pattern)
**Why sixth:** Add to routes (types and errors exist now)

**Folder:** `/documentation/patterns/cleaning/06-validation/`

**Changes:**
- Ensure all Zod schemas in `/lib/schemas/`
- Validate at API boundary only
- Remove validation from services
- Standardize validation error handling

**Impact:** Pattern - Use typed errors and responses

### Phase 7: Authentication (Pattern)
**Why seventh:** Standardize (uses errors and types)

**Folder:** `/documentation/patterns/cleaning/07-authentication/`

**Changes:**
- Consolidate auth helpers
- Standardize naming (requireAdmin, requireAuth, etc.)
- Remove duplicate auth functions
- Update all API routes to use standard helpers

**Impact:** Pattern - Use typed errors

### Phase 8: Logging (Quality)
**Why eighth:** Add throughout (all structure in place)

**Folder:** `/documentation/patterns/cleaning/08-logging/`

**Changes:**
- Standardize logger usage
- Add consistent scope naming
- Remove console.log, use logger

**Impact:** Quality - Just add logging to existing code

### Phase 9: Import Organization (Quality)
**Why ninth:** Clean up imports

**Folder:** `/documentation/patterns/cleaning/09-import-organization/`

**Changes:**
- Organize imports in standard order
- Use `import type` for types
- Remove unused imports

**Impact:** Quality - Cosmetic cleanup

### Phase 10: File Naming (Quality)
**Why last:** Rename files (everything else is perfect)

**Folder:** `/documentation/patterns/cleaning/10-file-naming/`

**Changes:**
- Rename files to follow conventions
- Update all imports
- Ensure no broken references

**Impact:** Quality - Final polish

---

## Cleanup Cycle Process (For Each Phase)

### Step 1: Create Workspace File

Create `workspace.md` in the phase folder:

```markdown
# Phase X: [Phase Name]

## Status
- [ ] Analysis Complete
- [ ] Plan Approved
- [ ] Implementation Complete
- [ ] Review Complete
- [ ] Build Verified
- [ ] Phase Complete

## Current Task
[What you're working on right now]

## Files Changed
- [ ] file1.ts
- [ ] file2.ts

## Build Status
- [ ] TypeScript check passes
- [ ] Build succeeds
- [ ] No ESLint errors

## Regressions Found
[List any issues found during review]

## Notes
[Any important observations]
```

### Step 2: Deploy 3 Explore Agents (Parallel)

**CRITICAL: Run these 3 agents in PARALLEL for speed**

Send a **single message** with **3 Task tool calls**:

```typescript
// Message content: "Deploy 3 explore agents for [Phase Name]"

<tool_use>
  <name>Task</name>
  <description>Find all relevant files</description>
  <subagent_type>Explore</subagent_type>
  <prompt>
    Task: Find ALL files relevant to [Phase Name]

    Search for:
    - [Pattern 1]
    - [Pattern 2]
    - [Pattern 3]

    Report back:
    - File paths found
    - Patterns detected
    - Count of occurrences

    Thoroughness: very thorough
  </prompt>
</tool_use>

<tool_use>
  <name>Task</name>
  <description>Analyze current patterns</description>
  <subagent_type>Explore</subagent_type>
  <prompt>
    Task: Analyze current implementation patterns for [Phase Name]

    Check:
    - Current error handling approach
    - Inconsistencies found
    - Anti-patterns detected

    Report back:
    - Summary of current state
    - Major issues found
    - Scope of changes needed

    Thoroughness: very thorough
  </prompt>
</tool_use>

<tool_use>
  <name>Task</name>
  <description>Identify dependencies</description>
  <subagent_type>Explore</subagent_type>
  <prompt>
    Task: Identify all dependencies and side effects for [Phase Name]

    Find:
    - Files that import target files
    - Cross-cutting concerns
    - Potential breaking changes

    Report back:
    - Dependency map
    - Files that will be affected
    - Risk areas

    Thoroughness: very thorough
  </prompt>
</tool_use>
```

**Wait for all 3 agents to complete**, then review their findings.

### Step 3: Write Clear Plan

Based on agent findings, create `PLAN.md`:

```markdown
# Phase X: [Phase Name] - Implementation Plan

## Analysis Summary
[Summary from 3 explore agents]

## Files to Change
1. `path/to/file1.ts`
   - Current state: [description]
   - Required changes: [description]
   - Risk: LOW/MEDIUM/HIGH

2. `path/to/file2.ts`
   - Current state: [description]
   - Required changes: [description]
   - Risk: LOW/MEDIUM/HIGH

## Dependencies Affected
- `dependent/file1.ts` - Will need import update
- `dependent/file2.ts` - Uses function signature that will change

## Side Effects to Handle
1. [Side effect 1] - Resolution: [how to fix]
2. [Side effect 2] - Resolution: [how to fix]

## Implementation Order
1. Create new error classes (no breaking changes)
2. Update services to use new errors (internal only)
3. Update API routes to catch new errors (external facing)
4. Remove old error handling code
5. Verify build

## Success Criteria
- [ ] All files follow STANDARDS.md pattern
- [ ] No functionality changes
- [ ] Build passes
- [ ] No TypeScript errors
- [ ] No ESLint errors

## Rollback Plan
If something breaks:
1. Revert commits: `git reset --hard [commit-hash]`
2. Document what went wrong in workspace.md
3. Adjust plan and retry
```

### Step 4: Implement Changes

**Execute the plan:**

1. **Create new files first** (if needed)
   - No breaking changes yet
   - Add new utilities, helpers, types

2. **Update files incrementally**
   - One resource at a time (e.g., all clients files, then invoices)
   - Update imports as you go
   - Keep track in workspace.md

3. **Remove old code last**
   - Only after new code is working
   - Remove dead code
   - Clean up unused imports

4. **Run build after each resource**
   ```bash
   npm run typecheck
   npm run build
   npm run lint
   ```

### Step 5: Deploy Review Agent

**After implementation is complete**, deploy review agent:

```typescript
<tool_use>
  <name>Task</name>
  <description>Review Phase X implementation</description>
  <subagent_type>general-purpose</subagent_type>
  <prompt>
    Task: Review the implementation of Phase X: [Phase Name]

    Check:
    1. All files follow patterns in /documentation/patterns/STANDARDS.md
    2. No functionality changes (compare behavior before/after)
    3. No regressions (all imports work, no broken references)
    4. Build passes (run npm run typecheck && npm run build)
    5. Code quality (consistent naming, no duplication)

    Review files:
    - [List all changed files]

    Report back:
    - PASS/FAIL for each criterion
    - Issues found (with file:line references)
    - Recommended fixes
    - Overall assessment

    Be thorough and strict. If anything violates standards, mark as FAIL.
  </prompt>
</tool_use>
```

### Step 6: Iterate Until Perfect

**If review finds issues:**

1. **Document issues** in workspace.md under "Regressions Found"
2. **Fix issues** one by one
3. **Re-run build** after each fix
4. **Deploy review agent again**
5. **Repeat until review passes**

**When review passes:**

1. Update workspace.md status to ✅
2. Commit changes with clear message
3. Move to next phase

---

## Build Verification (After Every Change)

**MANDATORY - Run these commands:**

```bash
# Type check
npm run typecheck

# Build
npm run build

# Lint
npm run lint
```

**If ANY command fails:**
- ❌ Stop immediately
- ❌ Do not proceed to next file
- ✅ Fix the error
- ✅ Re-run verification
- ✅ Only continue when all pass

---

## Commit Strategy

**Commit after each completed resource:**

```bash
git add .
git commit -m "Phase X: Update [resource] to follow [pattern]

- Changed files: [list]
- Pattern applied: [pattern name]
- Build verified: ✅

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

git push
```

**DO NOT:**
- ❌ Commit broken code
- ❌ Commit without running build
- ❌ Make huge commits (break into resources)

---

## Example: Phase 1 Execution (Database Access)

### Workspace.md (Initial)
```markdown
# Phase 1: Database Access

## Status
- [ ] Analysis Complete
- [ ] Plan Approved
- [ ] Implementation Complete
- [ ] Review Complete
- [ ] Build Verified
- [ ] Phase Complete

## Current Task
Starting analysis with 3 explore agents
```

### Deploy Explore Agents (Parallel)
```
Agent 1: Find all API routes that query database
Agent 2: Find all getServiceSupabase() calls
Agent 3: Find existing service functions
```

### Write Plan
```markdown
## Files to Change
1. Update `app/api/clients/route.ts` - Move queries to service
2. Update `server/services/clients.ts` - Add service functions
3. Update `app/api/invoices/[id]/route.ts` - Move queries to service
4. Update `server/services/invoices.ts` - Add service functions
...
```

### Implement
```bash
# Step 1: Move clients API queries to service
[Update both files]
npm run typecheck  # ✅
npm run build      # ✅

# Step 2: Move invoices API queries to service
[Update both files]
npm run typecheck  # ✅
npm run build      # ✅

git commit -m "Phase 1: Move clients and invoices queries to services"
```

### Review
```
Deploy review agent
→ Finds issue in quotes route (still has direct query)
→ Fix issue
→ Deploy review agent again
→ PASS ✅
```

### Complete
```markdown
## Status
- [x] Analysis Complete
- [x] Plan Approved
- [x] Implementation Complete
- [x] Review Complete
- [x] Build Verified
- [x] Phase Complete
```

---

## Critical Reminders

1. **NO functionality changes** - Only restructure code
2. **Build must pass** after every change
3. **Deploy agents in parallel** for speed (3 explore agents in one message)
4. **Review agent is mandatory** before marking phase complete
5. **Iterate until perfect** - Don't skip to next phase with issues
6. **Commit frequently** - After each resource cleanup
7. **Document everything** - Keep workspace.md updated

---

## Phase Completion Checklist

Before marking a phase complete:

- [ ] All files in scope updated
- [ ] All patterns from STANDARDS.md applied
- [ ] No functionality changes
- [ ] Review agent approved
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] All changes committed and pushed
- [ ] workspace.md fully updated
- [ ] No regressions found

---

## Next Steps

1. Start with **Phase 1: Database Access** ⚠️
2. Create folder: `/documentation/patterns/cleaning/01-database-access/`
3. Create `workspace.md` in that folder
4. Deploy 3 explore agents in parallel
5. Follow the cleanup cycle process

**Good luck! Be thorough, be careful, and verify everything.**

---

**Last Updated:** 2025-10-20
**Status:** Ready for Execution
