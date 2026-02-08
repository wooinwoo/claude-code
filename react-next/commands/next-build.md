---
description: Fix Next.js/Vite build errors, TypeScript compilation issues, and linter warnings incrementally. Invokes the next-build-resolver agent for minimal, surgical fixes.
---

# Next.js/Vite Build and Fix

This command invokes the **next-build-resolver** agent to incrementally fix build errors with minimal changes.

## What This Command Does

1. **Run Diagnostics**: Execute `tsc --noEmit`, `next build` or `vite build`, `eslint`
2. **Parse Errors**: Group by file and sort by severity
3. **Fix Incrementally**: One error at a time
4. **Verify Each Fix**: Re-run build after each change
5. **Report Summary**: Show what was fixed and what remains

## When to Use

Use `/next-build` when:
- `next build` or `vite build` fails with errors
- `tsc --noEmit` reports TypeScript errors
- `eslint .` shows warnings or errors
- Module imports are broken or circular
- After pulling changes that break the build

## Diagnostic Commands Run

```bash
# TypeScript compilation check
npx tsc --noEmit --pretty

# Framework build
npx next build
# or
npx vite build

# Linting
npx eslint . --ext .ts,.tsx --format stylish

# Module issues
npm ls --depth=0 2>&1 | grep "ERR!"
```

## Example Session

```text
User: /next-build

Agent:
# Build Resolution

## Initial Diagnostics

```bash
$ npx tsc --noEmit
src/components/Dashboard.tsx(25,15): error TS2304: Cannot find name 'UserData'.
src/hooks/useMarket.ts(42,9): error TS2322: Type 'string' is not assignable to type 'number'.
src/pages/api/markets.ts(58,2): error TS2355: A function whose declared type is neither 'undefined', 'void', nor 'any' must return a value.
```

Errors found: 3

## Fix 1: Missing Type Import

File: src/components/Dashboard.tsx:25
Error: Cannot find name 'UserData'
Cause: Missing import

```tsx
// Added import
import type { UserData } from '@/types/user';
```

```bash
$ npx tsc --noEmit
# 2 errors remaining
```

## Fix 2: Type Mismatch

File: src/hooks/useMarket.ts:42
Error: Type 'string' is not assignable to type 'number'

```tsx
// Changed
const count = params.get('count')
// To
const count = Number(params.get('count'))
```

```bash
$ npx tsc --noEmit
# 1 error remaining
```

## Fix 3: Missing Return

File: src/pages/api/markets.ts:58
Error: A function whose declared type is neither 'undefined', 'void', nor 'any' must return a value.

```tsx
// Added missing return
return NextResponse.json({ data: markets })
```

```bash
$ npx tsc --noEmit
# No errors!
$ npx next build
# Build successful!
```

## Final Verification

```bash
$ npx eslint . --ext .ts,.tsx
# No issues

$ npx vitest run
# All tests pass
```

## Summary

| Metric | Count |
|--------|-------|
| TypeScript errors fixed | 3 |
| ESLint warnings fixed | 0 |
| Files modified | 3 |
| Remaining issues | 0 |

Build Status: SUCCESS
```

## Common Errors Fixed

| Error | Typical Fix |
|-------|-------------|
| `TS2304: Cannot find name` | Add import or fix typo |
| `TS2322: Type X not assignable to Y` | Fix type or add conversion |
| `TS2355: Must return a value` | Add return statement |
| `TS2307: Cannot find module` | Install package or fix path |
| `TS18046: X is of type unknown` | Add type assertion or narrowing |
| `TS2345: Argument not assignable` | Fix argument type |
| `Module not found` | Check import path, install dependency |
| `Hydration mismatch` | Fix server/client render difference |
| `Dynamic import error` | Use `next/dynamic` or `React.lazy` correctly |
| `CSS import error` | Check PostCSS/Tailwind config |

## Fix Strategy

1. **TypeScript errors first** - Code must type-check
2. **Build errors second** - Must compile and bundle
3. **ESLint errors third** - Code quality rules
4. **Warnings last** - Style and best practices
5. **One fix at a time** - Verify each change
6. **Minimal changes** - Don't refactor, just fix

## Stop Conditions

The agent will stop and report if:
- Same error persists after 3 attempts
- Fix introduces more errors
- Requires architectural changes
- Missing external dependencies or configurations

## Related Commands

- `/react-test` - Run tests after build succeeds
- `/react-review` - Review code quality
- `/verify` - Full verification loop

## Related

- Agent: `agents/next-build-resolver.md`
- Skill: `skills/react-patterns/`
