---
description: Enforce test-driven development workflow. Scaffold interfaces, generate tests FIRST, then implement minimal code to pass. Ensure 80%+ coverage.
---

# TDD Command

This command invokes the **tdd-guide** agent to enforce test-driven development.

## TDD Cycle

```
RED → GREEN → REFACTOR → REPEAT

RED:      Write a failing test
GREEN:    Write minimal code to pass
REFACTOR: Improve code, keep tests passing
```

## When to Use

- Implementing new features
- Fixing bugs (reproduce with test first)
- Refactoring existing code
- Building critical business logic

## Related

- Agent: `tdd-guide`
- After TDD: `/verify` to confirm build, `/code-review` for review
