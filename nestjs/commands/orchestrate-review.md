---
description: Expert review of the plan. 4 parallel agents (schema, architecture, code, security) review and approve.
---

# Expert Plan Review

Review the plan using 4 specialized expert agents in parallel.

## Prerequisites

- [ ] Plan written via `/orchestrate-start`

## Procedure

### 1. Locate Plan File

```bash
ls plans/*.md
```

Read the most recent or specified plan file.

### 2. Launch 4 Expert Reviews (Parallel)

Launch all 4 agents simultaneously using the Task tool:

**Agent 1 — Schema Designer** (`schema-designer` agent):
```
Review the plan at plans/{plan-file}.md for database/schema concerns:

1. Table structure and relationships
2. Index strategy for query patterns
3. Migration safety (additive vs destructive changes)
4. Data integrity constraints (FK, UNIQUE, NOT NULL)
5. Naming conventions for tables and columns
6. Data type appropriateness

Report format:
- [CRITICAL/HIGH/MEDIUM/LOW] Finding → Recommendation
- "No schema concerns" if clean
```

**Agent 2 — Architect** (`architect` agent):
```
Review the plan at plans/{plan-file}.md for architectural fitness:

1. Hexagonal architecture layer separation
2. Correct dependency direction (Presentation → App → Domain ← Infra)
3. DI with Symbol tokens
4. Entity immutability pattern (private constructor + factory)
5. Bounded context boundary respect
6. Domain event needs identified
7. No circular dependencies

Report format:
- [CRITICAL/HIGH/MEDIUM/LOW] Finding → Recommendation
- "No architecture concerns" if clean
```

**Agent 3 — Code Reviewer** (`code-reviewer` agent):
```
Review the plan at plans/{plan-file}.md for implementation quality:

1. All API endpoints covered
2. Error cases handling planned (400, 401, 403, 404, 409)
3. Validation rules specified
4. E2E test scenarios included (per endpoint minimum)
5. Correct implementation order (Domain → Infra → App)
6. Parallel agent work distribution is sound
7. No file conflicts between agents
8. Naming conventions followed

Report format:
- [CRITICAL/HIGH/MEDIUM/LOW] Finding → Recommendation
- "No quality concerns" if clean
```

**Agent 4 — Security Reviewer** (`security-reviewer` agent):
```
Review the plan at plans/{plan-file}.md for security concerns:

1. Authentication requirements identified
2. Authorization (role/ownership) checks planned
3. Input validation strategy defined
4. SQL injection prevention (parameterized queries)
5. Sensitive data exposure risks
6. Rate limiting needs
7. OWASP Top 10 relevance check

Report format:
- [CRITICAL/HIGH/MEDIUM/LOW] Finding → Recommendation
- "No security concerns" if clean
```

### 3. Aggregate Expert Results

Collect all 4 expert reports and present unified results:

```markdown
## Expert Review Results

### Schema Design
{Agent 1 findings}

### Architecture
{Agent 2 findings}

### Code Quality
{Agent 3 findings}

### Security
{Agent 4 findings}

---

### Summary
- CRITICAL: {count}
- HIGH: {count}
- MEDIUM: {count}
- LOW: {count}

### Required Actions
1. [CRITICAL] {issue} → {fix}
2. [HIGH] {issue} → {fix}
```

### 4. Apply Fixes

If CRITICAL or HIGH issues found:
1. Update the plan file with fixes
2. Report what changed

### 5. Approve

When all CRITICAL and HIGH issues are resolved:

```markdown
---
**Status**: Plan approved — proceed with `/orchestrate-impl`
**Approved**: {date}
**Reviews**: Schema OK | Architecture OK | Code OK | Security OK
---
```

## Done Criteria

- [ ] All 4 expert reviews completed
- [ ] CRITICAL and HIGH issues resolved
- [ ] Plan updated with fixes
- [ ] Plan approved

## Next Step

```
/orchestrate-impl
```

## Examples

```
/orchestrate-review
```
→ Review the latest plan with 4 parallel experts

```
/orchestrate-review GIFCA-66
```
→ Review the plan for a specific Jira key
