# ORACLE TASK: 3D Model Rendering System Diagnosis & Implementation Plan

## CRITICAL CONTEXT

You are analyzing a production Next.js/React application (3dprintsydney) with a broken 3D model rendering system in the quick-order workflow. The user uploads STL/3D files for 3D printing quotes, but the preview system is completely non-functional.

## BROKEN FUNCTIONALITY

The following features are NOT working in `src/app/(client)/quick-order/page.tsx`:

1. **3D Model Preview**: Model may render but controls are broken
2. **Orientation Gizmo**: Controls to rotate/orient the model relative to build plate - NOT functional
3. **Rotation Controls**: UI controls (buttons/sliders) to adjust orientation - NOT responsive
4. **Model Positioning**: Model keeps resetting to original position when user attempts to move it
5. **Support Material Rendering**: Support structure visualization not showing
6. **Constant Reloading**: Unexplained re-renders/reloads occurring
7. **Build Plate Alignment**: Model not staying aligned to virtual build plate

## TECH STACK (from package.json analysis expected)

- **Framework**: Next.js 14+ (App Router)
- **3D Rendering**:
  - `react-three-fiber` (R3F) - React renderer for Three.js
  - `@react-three/drei` - R3F helpers/components
  - `three` - Core 3D library
- **State Management**: Zustand (`src/stores/orientation-store.ts`)
- **Component Architecture**: React functional components with hooks

## CODEBASE PROVIDED

The `oracle-codebase.md` file contains 23 core files (32.6k tokens):

### Core 3D Components
- `ModelViewer.tsx` - Main 3D viewer (11k tokens - largest file)
- `ModelViewerWrapper.tsx` - Wrapper component
- `OrientationGizmo.tsx` - Orientation control UI
- `RotationControls.tsx` - Rotation UI (3.3k tokens)
- `BuildPlate.tsx` - Build plate rendering
- `OverhangHighlight.tsx` - Support visualization
- `ViewNavigationControls.tsx` - Camera controls

### State & Utilities
- `stores/orientation-store.ts` - Zustand store for 3D state (2k tokens)
- `lib/3d/coordinates.ts` - Coordinate transformations
- `lib/3d/geometry.ts` - Geometry utilities
- `lib/3d/orientation.ts` - Orientation calculations (3k tokens)
- `lib/3d/face-alignment.ts` - Face alignment
- `lib/3d/export.ts` - Export utilities
- `lib/3d/webgl-context.ts` - WebGL management
- `lib/3d/build-volume.ts` - Build volume calcs
- `lib/3d/overhang-detector.ts` - Support detection

### Server-Side
- `server/geometry/load-geometry.ts` - STL loading
- `server/geometry/orient.ts` - Server-side orientation

### API Routes
- `api/quick-order/orient/route.ts` - Orientation endpoint
- `api/quick-order/analyze-supports/route.ts` - Support analysis

### Other
- `hooks/use-webgl-context.ts` - WebGL hook
- `workers/overhang-worker.ts` - Support calculation worker
- `lib/types/modelling.ts` - Type definitions

## YOUR RESEARCH MISSION

### Phase 1: Root Cause Analysis

**1. Analyze the Codebase**
   - Read `oracle-codebase.md` completely
   - Identify state management flow between:
     - Parent page → ModelViewerWrapper → ModelViewer
     - Orientation store ↔ Components
     - User interactions → State updates → Re-renders
   - Find potential infinite render loops
   - Identify state synchronization issues
   - Check for missing dependencies in useEffect/useMemo/useCallback

**2. Research React-Three-Fiber Best Practices**
   Search official docs and repos:
   - https://docs.pmnd.rs/react-three-fiber
   - https://github.com/pmndrs/react-three-fiber
   - Common pitfalls with R3F state management
   - How to properly integrate TransformControls/OrbitControls
   - Proper mesh/object3D state updates without re-mounting

**3. Research Real-World Implementations**
   Find open-source projects with similar features:
   - STL viewer with orientation controls
   - 3D printing preview tools (e.g., PrusaSlicer web, Thingiverse viewers)
   - React-three-fiber projects with gizmo controls
   - Projects using TransformControls from drei

   **Search GitHub for:**
   - `react-three-fiber STL viewer orientation`
   - `@react-three/drei TransformControls example`
   - `three.js build plate alignment`
   - `react-three-fiber state management pattern`

**4. Identify Common Patterns**
   From research, document:
   - How do successful implementations handle:
     - Model orientation persistence
     - Gizmo/TransformControls integration
     - Preventing unwanted re-renders
     - Build plate/grid alignment
     - Camera control synchronization
   - What state management patterns work best?
   - How to avoid React reconciliation issues with Three.js objects?

### Phase 2: Diagnostic Hypotheses

Based on code analysis, form hypotheses about root causes:

**Likely Culprits to Investigate:**
- React state updates triggering full scene re-mounts
- Zustand store updates causing component cascade re-renders
- TransformControls not properly attached/detached
- Coordinate system mismatches (R3F uses Y-up, STL might be Z-up)
- Missing `useRef` for Three.js objects
- OrbitControls conflicting with TransformControls
- Build plate not in correct coordinate space
- Orientation quaternion/euler conversion issues
- Missing event handlers for drag start/end
- WebGL context loss/recreation

**State Management Issues:**
- Store updates triggering re-renders that reset Three.js object transforms
- Missing selectors causing over-subscription
- Stale closures in event handlers
- Race conditions between server orientation API and client state

### Phase 3: Implementation Plan

Provide a **HIGH-LEVEL IMPLEMENTATION PLAN** (NOT full code) with:

#### 3.1 Architecture Principles
- State management strategy (when to use Zustand vs local state vs refs)
- Component hierarchy and data flow
- Event handling approach
- Coordinate system conventions

#### 3.2 Core Components Redesign

**For each component (ModelViewer, OrientationGizmo, RotationControls, BuildPlate):**
- Purpose and responsibilities
- Props interface
- State management approach
- Key hooks/effects needed
- Integration points with other components
- Critical implementation notes from research

#### 3.3 State Management Refactor

**Zustand Store Design:**
- What state belongs in the store vs local
- Store slices/organization
- Selectors to prevent over-rendering
- Actions and their side effects
- Persistence strategy

**React State:**
- What needs local state
- Ref strategy for Three.js objects
- Derived state calculations

#### 3.4 Fix Strategy for Each Issue

| Issue | Root Cause | Fix Approach |
|-------|------------|--------------|
| Model resets position | (your analysis) | (high-level fix) |
| Gizmo not working | (your analysis) | (high-level fix) |
| Constant reloading | (your analysis) | (high-level fix) |
| Support rendering broken | (your analysis) | (high-level fix) |
| Build plate misalignment | (your analysis) | (high-level fix) |

#### 3.5 Implementation Steps

Ordered sequence of changes:
1. **Step 1**: (e.g., "Isolate ModelViewer from parent re-renders")
   - Why this first
   - What to change
   - Validation criteria

2. **Step 2**: (e.g., "Refactor orientation store")
   - ...

3. **Step 3**: (e.g., "Integrate TransformControls properly")
   - ...

(Continue for all necessary steps)

#### 3.6 Critical Implementation Notes

- Three.js gotchas to avoid
- R3F-specific patterns to follow
- Testing/validation approach for each fix
- Performance considerations
- Fallback strategies

### Phase 4: Reference Resources

Provide specific links/examples found:
- Relevant R3F documentation sections (with URLs)
- Example repos demonstrating solutions (with GitHub URLs)
- Stack Overflow threads addressing similar issues (with URLs)
- Code snippets from other projects showing key patterns (with attribution)

## OUTPUT REQUIREMENTS

Your response should be a **comprehensive markdown document** structured as:

```markdown
# 3D Model Rendering System: Root Cause Analysis & Implementation Plan

## Executive Summary
- Brief overview of findings
- Top 3 root causes identified
- Recommended approach

## Part 1: Root Cause Analysis

### 1.1 Code Analysis Findings
(Your detailed analysis of the provided code)

### 1.2 State Management Issues
(Specific problems found)

### 1.3 Component Integration Problems
(How components fail to work together)

### 1.4 Coordinate System & Transformation Issues
(Math/geometry problems)

## Part 2: Research Findings

### 2.1 React-Three-Fiber Best Practices
(From official docs with URLs)

### 2.2 Real-World Implementation Patterns
(From GitHub repos/projects with links)

### 2.3 Common Pitfall Solutions
(From community resources)

## Part 3: High-Level Implementation Plan

### 3.1 Architecture Principles
...

### 3.2 Component Redesign Strategy
...

### 3.3 State Management Refactor
...

### 3.4 Issue-by-Issue Fix Strategy
...

### 3.5 Implementation Steps (Ordered)
...

### 3.6 Validation & Testing Strategy
...

## Part 4: References & Resources

### Documentation
- [Link 1] ...
- [Link 2] ...

### Example Implementations
- [Repo 1] ...
- [Repo 2] ...

### Community Resources
- [Article/SO 1] ...
```

## CRITICAL CONSTRAINTS

1. **NO FULL CODE IMPLEMENTATION** - Provide architectural guidance, not complete code
2. **RESEARCH REQUIRED** - Must search online for R3F docs, example repos, best practices
3. **ACTIONABLE** - Plan must be specific enough for implementation by another engineer
4. **ROOT CAUSE FOCUSED** - Don't just describe what's broken, explain WHY it's broken
5. **EVIDENCE-BASED** - Back up recommendations with research findings and examples

## SUCCESS CRITERIA

Your plan is successful if an engineer can:
1. Understand exactly why the system is broken
2. Know what patterns to follow from research
3. Implement fixes step-by-step following your plan
4. Validate each fix works before moving to next
5. Avoid common pitfalls you've identified

## EXPECTED DEPTH

- **Code Analysis**: Deep dive into the 32k tokens provided
- **Research**: At least 5-10 quality external resources
- **Plan Detail**: Enough to guide implementation without writing full code
- **Examples**: Concrete patterns from real projects

---

Begin your analysis. Take your time to:
1. Thoroughly read the codebase
2. Research extensively online
3. Form well-reasoned hypotheses
4. Create a comprehensive, actionable plan