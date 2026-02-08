# Code Review

Invoke the **code-reviewer** agent to review uncommitted changes.

## Process

1. Run `git diff --name-only HEAD` to get changed files
2. Agent reviews each file for:
   - **CRITICAL**: Security vulnerabilities (hardcoded secrets, injection, XSS)
   - **HIGH**: Code quality (large functions, missing error handling)
   - **MEDIUM**: Best practices (mutation patterns, missing tests, a11y)
3. Generates severity-ranked report with file locations and suggested fixes
4. Blocks commit if CRITICAL/HIGH issues found

## Related

- Agent: `code-reviewer`
- For React-specific review: `/react-review`
- For security-focused review: invoke `security-reviewer` agent
