---
description: Analyze current changes and generate a conventional commit message.
---

# Commit Command

Analyze all staged and unstaged changes, then create a commit with a well-crafted conventional commit message.

## Steps

1. **Check staged changes** - Run `git diff --cached` to see staged changes
2. **Check unstaged changes** - Run `git diff` and `git status` to see all modifications
3. **Read recent commits** - Run `git log --oneline -10` to match existing commit style
4. **Analyze changes** - Understand what was changed and why
5. **Generate commit message** - Single-line conventional commit format
6. **Stage relevant files** - Add specific changed files (never use `git add -A` or `git add .`)
7. **Commit** - Create the commit

## Commit Message Format

```
<type>(<scope>): <description>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code restructuring without behavior change
- `docs`: Documentation only
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (deps, configs)
- `perf`: Performance improvement
- `ci`: CI/CD changes

### Rules
- Single line, under 72 characters
- Lowercase description, no period at end
- Use imperative mood ("add" not "added" or "adds")
- Scope should reflect the affected module/area
- Description explains the "what", not the "how"
- English only

### Examples
- `feat(auth): add JWT refresh token rotation`
- `fix(order): resolve race condition in payment callback`
- `refactor(user): extract email validation to value object`
- `test(product): add e2e tests for catalog search`
- `chore(deps): upgrade drizzle-orm to 0.35`

## Important

- NEVER commit files containing secrets (.env, credentials, tokens)
- NEVER use `git add -A` or `git add .` - stage specific files only
- If there are no changes, inform the user and stop
- If changes span multiple concerns, suggest splitting into separate commits
- Do NOT add `Co-Authored-By` attribution
