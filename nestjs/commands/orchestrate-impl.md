---
description: Implement with parallel agents. Plan-based Domain/Infra/App layer development.
---

# Parallel Agent Implementation

Implement the approved plan using parallel agents across layers.

## Prerequisites

- [ ] Plan approved via `/orchestrate-review`
- [ ] Working on a dedicated branch

## Procedure

### 1. Load Plan

```bash
# Extract identifier from current branch
git branch --show-current
```

Read the plan: `plans/{identifier}.md`

### 2. Verify Agent Assignment

Check the "Parallel Agent Assignment" section in the plan:

| Agent | Layer | Files |
|-------|-------|-------|
| Agent 1 | Domain | Entity, Repository Interface, Domain Error |
| Agent 2 | Infrastructure | Repository Impl, Mapper, Adapter |
| Agent 3 | Application | Use Case, Controller, DTO, E2E Test |

### 3. Phase 1: Domain + Infrastructure (parallel)

**Agent 1 — Domain Layer:**
```
Implement Phase 1 from `plans/{identifier}.md`:

1. Entity (apps/gifca/core/src/domain/entities/)
   - private constructor + create()/reconstitute()
   - getters only, immutability enforced

2. Repository Interface (apps/gifca/core/src/domain/repositories/)
   - Symbol token definition
   - Required method signatures

3. Domain Error (apps/gifca/core/src/domain/errors/)
   - Extends DomainError
   - Proper HTTP status code

Add index.ts exports
```

**Agent 2 — Infrastructure Layer:**
```
Implement Phase 2 from `plans/{identifier}.md`:

1. Mapper (apps/gifca/core/src/infrastructure/persistence/drizzle/mapper/)
   - toDomain(): DB Row → Entity
   - toPersistence(): Entity → DB Insert

2. Repository Impl (apps/gifca/core/src/infrastructure/persistence/drizzle/repositories/)
   - Drizzle conditional array pattern
   - Use Mapper for conversions

Add index.ts exports

Note: Wait for Agent 1's Interface to complete first
```

### 4. Phase 2: Application Layer

**Agent 3 — Application Layer:**
```
Implement Phase 3-4 from `plans/{identifier}.md`:

1. Use Case (apps/gifca/app/src/modules/{domain}/use-cases/)
   - exec(input): Promise<output> signature
   - @Transactional() decorator
   - DI with Symbol tokens

2. Controller (apps/gifca/app/src/modules/{domain}/)
   - @ApiTags, @ApiOperation decorators
   - DTO conversion (plainToInstance)

3. DTO (apps/gifca/app/src/modules/{domain}/dto/)
   - Request: class-validator decorators
   - Response: @Expose() required

4. Module registration
   - Provider bindings
   - Exports

5. E2E Test (apps/gifca/app/test/)
   - Success cases
   - Error cases (400, 401, 404, 409)

Note: Wait for Phase 1 to complete first
```

### 5. Execute Agents

```typescript
// Launch agents in parallel where possible
Task(agent1_prompt, subagent_type: "general-purpose")
Task(agent2_prompt, subagent_type: "general-purpose")
Task(agent3_prompt, subagent_type: "general-purpose")
```

**When dependencies exist:**
```
Phase 1 (parallel): Agent 1 (Domain) + Agent 2 (Mapper only)
    ↓
Phase 2 (sequential): Agent 2 (Repository Impl)
    ↓
Phase 3 (sequential): Agent 3 (Application)
```

### 6. Integration Verification

After all agents complete:

```bash
pnpm biome check --write .
pnpm build
pnpm test:e2e:gifca
```

## Error Handling

### Build failure
```
/build-fix
```

### Test failure
Analyze failed tests, re-run the responsible agent.

## Done Criteria

- [ ] All agents completed
- [ ] Build passes
- [ ] E2E tests pass

## Next Step

```
/orchestrate-done
```

## Examples

```
/orchestrate-impl
```
→ Implement based on current branch's plan

```
/orchestrate-impl GIFCA-66
```
→ Implement based on a specific plan
