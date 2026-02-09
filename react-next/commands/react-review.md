---
description: "Comprehensive React/TypeScript code review for component patterns, hooks usage, rendering optimization, and accessibility. Invokes the react-reviewer agent."
---

# React/TypeScript Code Review

## What This Command Does

1. **Scan the target files or directories** for React components, hooks, and utility modules
2. **Analyze component patterns** including prop drilling, composition, and state management
3. **Evaluate hooks usage** for correctness (dependency arrays, stale closures, custom hook extraction)
4. **Check rendering performance** for unnecessary re-renders, missing memoization, and heavy computations in render paths
5. **Audit accessibility** for semantic HTML, ARIA attributes, keyboard navigation, and screen reader support
6. **Generate a structured review report** with severity-ranked findings and actionable fix suggestions

## When to Use

- Before merging a PR that introduces or modifies React components
- After a large refactor touching multiple components or shared hooks
- When onboarding to an unfamiliar part of the frontend codebase
- When performance regressions are suspected in the UI layer
- During periodic codebase health checks on the frontend

## Review Categories

### CRITICAL

Issues that will cause bugs, crashes, or data loss in production:

- **Rules of Hooks violations** -- calling hooks conditionally or inside loops
- **Missing keys in lists** or using array index as key for dynamic lists
- **Uncontrolled side effects** -- missing cleanup in useEffect, race conditions in async effects
- **Security vulnerabilities** -- dangerouslySetInnerHTML with unsanitized input, exposed secrets in client bundles
- **State mutations** -- directly mutating state objects instead of using setter functions
- **Memory leaks** -- subscriptions or timers not cleaned up on unmount

### HIGH

Issues that degrade quality, maintainability, or user experience:

- **Excessive prop drilling** -- passing props through 3+ levels without context or composition
- **Missing error boundaries** -- unhandled errors in component trees causing full-page crashes
- **Accessibility violations** -- missing alt text, non-interactive elements with click handlers, missing form labels
- **Large component files** -- components exceeding 300 lines without extraction
- **Missing TypeScript strictness** -- liberal use of `any`, missing return types on exported functions
- **Unoptimized re-renders** -- components re-rendering on every parent render without memoization when expensive

### MEDIUM

Issues that affect code consistency and developer experience:

- **Inconsistent naming conventions** -- mixing camelCase and snake_case, unclear component names
- **Missing or stale JSDoc/comments** on exported components and hooks
- **Unused imports, variables, or props** left in component files
- **Inline styles** where CSS modules or styled-components should be used
- **Hardcoded strings** that should be extracted to constants or i18n keys
- **Test coverage gaps** -- exported components or hooks without corresponding test files

## Automated Checks

The review process runs the following automated checks before manual analysis:

```bash
# TypeScript compilation check
npx tsc --noEmit --pretty

# ESLint with React-specific rules
npx eslint . --ext .ts,.tsx --format stylish

# Check for unused exports (if available)
npx ts-prune --project tsconfig.json 2>/dev/null || true
```

## Example Session

```
User: /react-review src/components/Dashboard/

Review: src/components/Dashboard/

Running automated checks...
  tsc --noEmit: 2 errors found
  eslint: 5 warnings, 1 error

--- CRITICAL ---

[C1] Rules of Hooks violation in DashboardFilters.tsx:42
  useEffect is called inside a conditional block.
  Fix: Move the useEffect call to the top level of the component
  and use the condition inside the effect body.

[C2] Missing cleanup in useEffect in DashboardChart.tsx:87
  WebSocket subscription is created but never closed on unmount.
  Fix: Return a cleanup function that calls ws.close().

--- HIGH ---

[H1] Missing error boundary around DashboardChart.tsx
  If the chart library throws during render, the entire dashboard unmounts.
  Fix: Wrap the chart component in an ErrorBoundary with a fallback UI.

[H2] Accessibility: DashboardCard.tsx:23
  Clickable div without role="button", tabIndex, or keyboard handler.
  Fix: Use a <button> element or add role="button", tabIndex={0},
  and onKeyDown handler for Enter/Space.

[H3] Prop drilling: filterState passed through 4 component levels.
  Fix: Extract a DashboardFilterContext or use composition pattern.

--- MEDIUM ---

[M1] DashboardHeader.tsx:15 - Unused import: `useState`
[M2] DashboardTable.tsx - Inline styles on lines 34, 56, 78.
  Consider extracting to CSS module.
[M3] DashboardUtils.ts - Missing return type on exported function
  `formatMetric`. Add explicit return type annotation.

--- SUMMARY ---

  CRITICAL: 2 | HIGH: 3 | MEDIUM: 3
  Recommendation: REVISE (critical issues must be resolved)
```

## Approval Criteria

| Criteria                        | Requirement                                      |
|---------------------------------|--------------------------------------------------|
| CRITICAL issues                 | 0 remaining                                      |
| HIGH issues                     | All addressed or explicitly deferred with reason  |
| MEDIUM issues                   | Reviewed and acknowledged                        |
| TypeScript compilation          | `tsc --noEmit` passes with 0 errors              |
| ESLint                          | 0 errors (warnings acceptable if justified)       |
| Accessibility                   | No new a11y violations introduced                |
| Test coverage                   | New/modified components have corresponding tests  |

## Related

- `agents/react-reviewer.md` -- The react-reviewer agent definition used by this command
- `skills/react-patterns/` -- Approved React component and hook patterns for the project
