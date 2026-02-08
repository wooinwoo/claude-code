# Build Fix

Invoke the **build-error-resolver** agent to fix build errors incrementally.

## Process

1. Run `npm run build` or `pnpm build`
2. Agent parses errors, groups by file, sorts by severity
3. Fixes one error at a time, re-runs build after each fix
4. Stops if fix introduces new errors or same error persists after 3 attempts

## Related

- Agent: `build-error-resolver`
- For Next.js specific errors: `/next-build`
