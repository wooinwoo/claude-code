---
description: Start orchestrate workflow. Jira check → requirements Q&A → (issue creation) → branch setup → plan writing.
---

# Start Orchestrate Workflow

Initializes a new feature development cycle.

## Procedure

### 1. Check Jira Issue

Ask the user if a Jira issue already exists:

```
Do you have an existing Jira issue?
- Yes: provide the issue key (e.g., PROJ-123)
- No: I'll create one
- Standalone: no Jira needed
```

**If issue exists:**
- Fetch and review via `mcp__jira__jira_get_issue`
- Skip issue creation (step 3)
- Still run requirements Q&A to clarify details

### 2. Requirements Q&A

Conduct an interactive interview based on the user's initial prompt.

**Must clarify:**
- Purpose and user value
- API endpoint spec (method, path, request/response)
- Business rules and validation logic
- Error handling scenarios
- External service integrations

**Even if an issue exists**, refine unclear parts and finalize implementation details.

**Output:** Structured requirements document

### 3. Create Jira Issue (new issue only)

> **Skip this step if an existing issue was provided or standalone mode. Go to step 4.**

Confirm project key, component, and assignee with the user before creating:

```typescript
mcp__jira__jira_create_issue({
  project_key: "{confirm with user}",
  summary: "{feature name}",
  issue_type: "Task",
  description: `
## Background
{background from Q&A}

## Tasks
{concrete implementation items}

## Done Criteria
- [ ] API implementation complete
- [ ] E2E tests passing
- [ ] Code review done

## References
- {links}
`
})
```

### 4. Workspace Detection

Detect whether the repository uses a worktree structure:

```bash
# Check if git gtr is available and current repo is a worktree-managed workspace
git gtr list 2>/dev/null
```

| Condition | Workspace Type |
|-----------|---------------|
| `git gtr list` succeeds and shows worktree entries | **Worktree** |
| `.git` is a file (not a directory) | **Worktree** |
| Otherwise | **Branch** |

Set `WORKSPACE = worktree | branch` and carry it through all phases.

### 5. Create Workspace (MANDATORY)

**Always work on a separate workspace. This is not optional.**

**Worktree mode:**

```bash
# Jira mode
git gtr new {JIRA-KEY}-{feature-slug}

# Standalone mode
git gtr new {feature-slug}
```

> Auto-runs: `.env` copy + `pnpm install` (when using gtr)
> After creation, **cd into the new worktree directory** to continue work there.

**Branch mode:**

```bash
# Jira mode
git checkout -b {JIRA-KEY}-{feature-slug}

# Standalone mode
git checkout -b {feature-slug}
```

### 6. Write Plan

**Jira mode:** Create `plans/{jira-key}.md`
**Standalone mode:** Create `plans/{feature-slug}.md`

```markdown
# Implementation Plan: {feature name}

## Tracking
- {Jira mode: "Issue: {JIRA-KEY}" | Standalone: "Branch: {branch-name}"}
- {Jira mode: "Link: {Jira URL}" | Standalone: omit}

## Requirements Summary
{structured Q&A results}

## Affected Layers

### @gifca/db (if applicable)
- [ ] Schema change: {table name}

### @gifca/core
- [ ] Entity: {EntityName}
- [ ] Repository Interface: I{Name}Repository
- [ ] Repository Impl: Drizzle{Name}Repository
- [ ] Mapper: {Name}Mapper
- [ ] Domain Error: {ErrorName}

### @gifca/app
- [ ] Use Case: {ActionName}UseCase
- [ ] Controller: {Name}Controller
- [ ] Request DTO: {Action}RequestDto
- [ ] Response DTO: {Action}ResponseDto
- [ ] E2E Test: {name}.e2e-spec.ts

## Implementation Phases

### Phase 1: Domain Layer
1. {Create Entity}
2. {Define Repository Interface}
3. {Add Domain Errors}

### Phase 2: Infrastructure Layer
4. {Implement Repository}
5. {Create Mapper}

### Phase 3: Application Layer
6. {Implement Use Case}
7. {Create Controller}
8. {Write DTOs}

### Phase 4: Test
9. {Write E2E tests}

## Risks
- {risk items}

## Parallel Agent Assignment

| Agent | Scope | Files |
|-------|-------|-------|
| Agent 1 | Domain | Entity, Interface, Error |
| Agent 2 | Infra | Repository, Mapper |
| Agent 3 | App | UseCase, Controller, DTO, Test |

---
**Status**: Plan ready — proceed with `/orchestrate-review`
```

## Done Criteria

- [ ] Requirements clarified
- [ ] Branch created
- [ ] Plan document written
- [ ] Jira issue confirmed (if Jira mode)

## Next Step

```
/orchestrate-review
```

## Examples

```
/orchestrate-start add 1:1 inquiry feature
```
→ Ask Jira or standalone → Q&A → branch → plan

```
/orchestrate-start GIFCA-123
```
→ Fetch GIFCA-123 → Q&A to refine details → branch → plan

```
/orchestrate-start --no-jira add health check
```
→ Standalone: Q&A → branch → plan
