# Test Coverage

Analyze test coverage and generate missing tests to reach 80%+ threshold.

## Process

1. Run `pnpm test --coverage` (or `npm test -- --coverage`)
2. Parse `coverage/coverage-summary.json`
3. Identify files below 80% coverage
4. Generate tests for uncovered paths (happy path, errors, edge cases)
5. Verify new tests pass
6. Show before/after metrics

## Related

- For TDD approach: `/tdd`
- For React component tests: `/react-test`
