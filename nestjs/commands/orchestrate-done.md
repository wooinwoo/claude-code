---
description: Finalize development and create PR. Verification loop → code review → commit → PR.
---

# Finalize and Create PR

Run quality verification, code review, and create a Pull Request.

## Prerequisites

- [ ] Implementation complete via `/orchestrate-impl`
- [ ] Working on a dedicated branch

## Procedure

### 1. Verification Loop

Run the verification loop until all checks pass. **Do not proceed to step 2 until the loop exits cleanly.**

```
LOOP:
  1. Run lint & format
     $ pnpm biome check --write .

  2. Run build
     $ pnpm build
     → On failure: fix errors (or run /build-fix), then RESTART LOOP

  3. Run E2E tests
     $ pnpm test:e2e:gifca
     → On failure: analyze and fix failing tests, then RESTART LOOP

  4. All green → EXIT LOOP
```

**Rules:**
- Max 3 loop iterations. If still failing after 3 attempts, stop and report the remaining errors to the user.
- Each iteration must start from step 1 (lint) to catch regressions introduced by fixes.
- Never skip a failing step — fix it or escalate.

### 2. Code Review (agents, parallel)

Launch both agents in parallel:

**security-reviewer** agent:
```
Review changed files for security:
- Authentication/authorization checks
- Input validation
- SQL injection prevention
- Sensitive data exposure
```

**code-reviewer** agent:
```
Review changed files for quality:
- Hexagonal architecture compliance
- Naming conventions
- Error handling patterns
- Code duplication
```

If CRITICAL or HIGH issues are found, fix them and **re-run the verification loop (step 1)**.

### 3. Commit

```bash
git status
git add {specific files}

git commit -m "$(cat <<'EOF'
feat(gifca/app): {description}

- {change 1}
- {change 2}

JIRA: {JIRA-KEY}
EOF
)"
```

### 4. Create PR

```bash
git push -u origin {branch}

gh pr create --title "{type}({scope}): {description} {JIRA-KEY}" --body "$(cat <<'EOF'
## 개요
{problem solved or feature added}

## 주요 변경사항
- {change 1}
- {change 2}

## 테스트
- [x] E2E 테스트 추가
- [x] 로컬 테스트 완료
- [x] 기존 테스트 통과

## 참고사항
{review points, constraints, follow-ups if any}
EOF
)"
```

**Standalone mode:** omit JIRA-KEY from title and commit body.

### 5. Update Jira Status (Jira mode only)

```typescript
mcp__jira__jira_transition_issue({
  issue_key: "{JIRA-KEY}",
  transition: "In Review"
})
```

### 6. Cleanup Reminder

After PR is merged:

**Worktree mode:**
```bash
git gtr rm {branch} --delete-branch --yes
```

**Branch mode:**
```bash
git checkout main && git pull && git branch -d {branch}
```

## Done Criteria

- [ ] Verification loop passed (build + test green)
- [ ] Security review done
- [ ] Code review done
- [ ] PR created
- [ ] PR URL returned

## Output Format

```markdown
## Development Complete

### Verification
- Biome: pass
- Build: pass
- E2E Test: 12/12 pass
- Security Review: no issues
- Code Review: no issues

### Pull Request
- **URL**: https://github.com/{org}/{repo}/pull/{number}
- **Title**: feat(gifca/app): add inquiry feature GIFCA-66
- **Branch**: GIFCA-66-inquiry → main

### Next Steps
1. Request PR review
2. Merge after approval
3. Worktree: `git gtr rm {branch} --delete-branch --yes`
   Branch: `git branch -d {branch}`
```

## Examples

```
/orchestrate-done
```
→ Run verification loop, review, and create PR

```
/orchestrate-done --skip-review
```
→ Skip code review agents (hotfix only)
