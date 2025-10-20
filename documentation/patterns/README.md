# Patterns & Standards Documentation

This directory contains the approved patterns, standards, and cleanup process for the 3D Print Sydney codebase.

## 📁 Structure

```
patterns/
├── README.md                    # This file
├── STANDARDS.md                 # ✅ Approved patterns and standards
├── INDEX.md                     # 📋 Cleanup process instructions
└── cleaning/                    # 🔧 Cleanup workspace
    ├── README.md               # Workspace overview
    ├── WORKSPACE_TEMPLATE.md   # Template for each phase
    ├── 01-error-handling/      # Phase 1 workspace
    ├── 02-type-organization/   # Phase 2 workspace
    └── ...                     # Phases 3-10
```

## 📚 Key Documents

### 1. STANDARDS.md ✅
**Status:** Approved
**Purpose:** The single source of truth for all code patterns

**Contains:**
- 10 core patterns (database access, services, errors, types, etc.)
- Code examples (✅ correct vs ❌ incorrect)
- API route template
- Service template

**When to use:**
- Before writing any new code
- When reviewing code
- When cleaning up existing code
- When onboarding new developers

### 2. INDEX.md 📋
**Status:** Ready for execution
**Purpose:** Step-by-step cleanup process

**Contains:**
- 10 cleanup phases (in order)
- Detailed cleanup cycle process
- Build verification steps
- Commit strategy
- Example execution

**When to use:**
- When starting a cleanup phase
- When executing systematic code improvements
- When deploying explore/review agents

### 3. cleaning/ 🔧
**Status:** Workspace ready
**Purpose:** Working directory for all cleanup activities

**Contains:**
- Phase-specific folders
- Workspace tracking (workspace.md)
- Implementation plans (PLAN.md)
- Explore agent findings

**When to use:**
- During cleanup execution
- To track progress
- To document decisions

## 🎯 Goals

1. **Consistency:** Every similar operation follows the same pattern
2. **Reliability:** No regressions, all builds pass
3. **Maintainability:** Clear structure, easy to understand
4. **Type Safety:** Explicit types everywhere, no `any`

## 🚫 Constraints

- ❌ NO functionality changes
- ❌ NO breaking changes
- ❌ NO skipping build verification
- ✅ ONLY restructure and organize code

## 🚀 How to Start

### For Cleanup Work:

1. **Read STANDARDS.md** - Understand all patterns
2. **Read INDEX.md** - Understand the process
3. **Start Phase 1** - Error Handling
   ```bash
   cd documentation/patterns/cleaning
   mkdir 01-error-handling
   cp WORKSPACE_TEMPLATE.md 01-error-handling/workspace.md
   ```
4. **Follow INDEX.md** - Execute cleanup cycle

### For New Development:

1. **Read STANDARDS.md** - Follow patterns
2. **Use templates** - API route template, Service template
3. **Verify patterns** - Before committing

## 📊 Phase Order

Phases must be completed in this order:

1. **Error Handling** - Foundation for all errors
2. **Type Organization** - Standardize all types
3. **API Response Format** - Standard envelope
4. **Database Access** - Services-only pattern ⚠️ Critical
5. **Service Layer** - Business logic organization ⚠️ Critical
6. **Authentication** - Auth helper standardization
7. **Validation** - Zod schema patterns
8. **Logging** - Structured logging
9. **Import Organization** - Import order
10. **File Naming** - Rename to conventions

⚠️ **Critical phases** affect architecture - be extra careful

## 🔍 Quick Reference

### Database Access
```typescript
// ✅ Services only
const clients = await getClients();

// ❌ Never in API routes
const supabase = getServiceSupabase();
```

### Error Handling
```typescript
// ✅ Typed errors
throw new NotFoundError('Client', id);

// ❌ Generic errors
throw new Error('Not found');
```

### API Response
```typescript
// ✅ Standard envelope
return success(client);
return fail('NOT_FOUND', 'Client not found', 404);

// ❌ Raw NextResponse
return NextResponse.json({ client });
```

### Types
```typescript
// ✅ Feature-colocated
import type { ClientDTO } from '@/lib/types/clients';

// ❌ Scattered
import type { Client } from './types';
```

## 📝 Current Status

**Documentation:** ✅ Complete
**Cleanup Started:** ❌ Not yet
**Current Phase:** None

## 🆘 Need Help?

1. **Check STANDARDS.md** - Pattern you need is likely documented
2. **Check INDEX.md** - Process guidance for cleanup
3. **Check examples** - API route template, service template
4. **Ask questions** - Document unclear patterns

---

## 🎓 Learning Path

### For New Developers:

1. Read `/documentation/SYSTEM_OVERVIEW.md` - Understand architecture
2. Read `STANDARDS.md` - Learn patterns
3. Read existing code that follows patterns
4. Write new code using patterns
5. Review your code against STANDARDS.md

### For Cleanup Agents:

1. Read all documentation first
2. Follow INDEX.md process exactly
3. Deploy explore agents in parallel
4. Implement carefully
5. Deploy review agent
6. Iterate until perfect

---

**Last Updated:** 2025-10-20
**Status:** Ready for Use
**Owner:** Development Team
