---
description: NestJS feature development pipeline. Auto-detects current phase from state file and continues.
---

# Orchestrate — NestJS Pipeline

단일 커맨드로 전체 개발 사이클을 관리합니다.
`.orchestrate/state.json`으로 현재 단계를 추적하며, `/orchestrate`를 반복 호출하면 자동으로 다음 단계로 진행합니다.

## Phase Detection

**먼저 `.orchestrate/state.json` 파일을 확인합니다.**

- 파일 없음 → **Phase 1: Start**
- `"phase": "review"` → **Phase 2: Review**
- `"phase": "impl"` → **Phase 3: Implement**
- `"phase": "done"` → **Phase 4: Done**
- `"phase": "complete"` → 이미 완료됨. 새로 시작하려면 `/orchestrate <새 기능>`

**인자가 있으면** (예: `/orchestrate 결제 모듈`) 항상 Phase 1부터 시작합니다 (기존 state 덮어쓰기).

---

## Phase 1: Start

요구사항 확인 → 워크스페이스 생성 → 플랜 작성

### 1-1. Jira 확인

```
기존 Jira 이슈가 있나요?
- Yes: 이슈 키 입력 (예: PROJ-123)
- No: 새로 생성
- Standalone: Jira 없이 진행
```

**이슈 있으면:** `mcp__jira__jira_get_issue`로 조회 → 이슈 생성 스킵

### 1-2. 요구사항 Q&A

사용자와 인터뷰하여 다음을 명확히:

- **목적과 사용자 가치** — 왜 이 기능이 필요한가?
- **API 엔드포인트 스펙** — method, path, request/response
- **비즈니스 규칙과 검증 로직**
- **에러 처리 시나리오**
- **외부 서비스 연동**

### 1-3. Jira 이슈 생성 (필요시)

> 이미 이슈가 있거나 standalone이면 스킵

### 1-4. 워크스페이스 감지 & 생성

```bash
# worktree 사용 여부 확인
git gtr list 2>/dev/null
```

| 조건 | 타입 |
|------|------|
| `git gtr list` 성공 | **Worktree** |
| `.git`이 파일 (디렉토리 아님) | **Worktree** |
| 기타 | **Branch** |

**Worktree 모드:**
```bash
git gtr new {JIRA-KEY}-{feature-slug}
# → .env 복사 + pnpm install 자동 실행
# → 새 worktree 디렉토리로 cd
```

**Branch 모드:**
```bash
git checkout -b {JIRA-KEY}-{feature-slug}
```

### 1-5. 플랜 작성

`plans/{identifier}.md` 생성:

```markdown
# Implementation Plan: {feature name}

## Tracking
- Issue: {JIRA-KEY 또는 branch name}

## Requirements Summary
{Q&A 결과 정리}

## Affected Layers

### Domain (@gifca/core)
- [ ] Entity: {EntityName}
- [ ] Repository Interface: I{Name}Repository
- [ ] Domain Error: {ErrorName}

### Infrastructure (@gifca/core)
- [ ] Mapper: {Name}Mapper
- [ ] Repository Impl: Drizzle{Name}Repository

### Application (@gifca/app)
- [ ] Use Case: {ActionName}UseCase
- [ ] Controller: {Name}Controller
- [ ] Request DTO: {Action}RequestDto
- [ ] Response DTO: {Action}ResponseDto
- [ ] E2E Test: {name}.e2e-spec.ts

## Implementation Phases

### Phase 1: Domain Layer
1. Entity (private constructor + create/reconstitute)
2. Repository Interface (Symbol token)
3. Domain Errors

### Phase 2: Infrastructure Layer
4. Mapper (toDomain/toPersistence)
5. Repository Impl (Drizzle)

### Phase 3: Application Layer
6. Use Case (@Transactional)
7. Controller + DTOs
8. Module registration

### Phase 4: Test
9. E2E tests

## Parallel Agent Assignment

| Agent | Scope | Files |
|-------|-------|-------|
| Agent 1 | Domain | Entity, Interface, Error |
| Agent 2 | Infra | Repository, Mapper |
| Agent 3 | App | UseCase, Controller, DTO, Test |

## Risks
- {risk items}
```

### 1-6. 상태 저장

```bash
mkdir -p .orchestrate
```

`.orchestrate/state.json` 작성:

```json
{
  "feature": "{feature name}",
  "jira_key": "{JIRA-KEY or null}",
  "branch": "{branch name}",
  "plan_file": "plans/{identifier}.md",
  "workspace_type": "worktree|branch",
  "phase": "review",
  "started_at": "{ISO timestamp}"
}
```

### 1-7. 자동 진행

```
Phase 1 완료. 플랜이 작성되었습니다.
→ /orchestrate 를 호출하면 Phase 2 (전문가 리뷰)로 진행합니다.
```

---

## Phase 2: Review

4명의 전문가 에이전트가 병렬로 플랜을 리뷰합니다.

### 2-1. 플랜 로드

`.orchestrate/state.json`에서 `plan_file` 경로를 읽어 플랜을 로드합니다.

### 2-2. 4명의 전문가 병렬 리뷰

Task tool로 4개 에이전트 동시 실행:

**Agent 1 — Schema Designer** (`schema-designer`):
```
Review the plan at {plan_file} for database/schema concerns:
1. Table structure and relationships
2. Index strategy for query patterns
3. Migration safety (additive vs destructive)
4. Data integrity constraints (FK, UNIQUE, NOT NULL)
5. Naming conventions
6. Data type appropriateness

Report: [CRITICAL/HIGH/MEDIUM/LOW] Finding → Recommendation
```

**Agent 2 — Architect** (`architect`):
```
Review the plan at {plan_file} for architectural fitness:
1. Hexagonal architecture layer separation
2. Correct dependency direction (Presentation → App → Domain ← Infra)
3. DI with Symbol tokens
4. Entity immutability pattern (private constructor + factory)
5. Bounded context boundary respect
6. Domain event needs
7. No circular dependencies

Report: [CRITICAL/HIGH/MEDIUM/LOW] Finding → Recommendation
```

**Agent 3 — Code Reviewer** (`code-reviewer`):
```
Review the plan at {plan_file} for implementation quality:
1. All API endpoints covered
2. Error cases handling (400, 401, 403, 404, 409)
3. Validation rules specified
4. E2E test scenarios included
5. Correct implementation order (Domain → Infra → App)
6. Parallel agent work distribution
7. No file conflicts between agents

Report: [CRITICAL/HIGH/MEDIUM/LOW] Finding → Recommendation
```

**Agent 4 — Security Reviewer** (`security-reviewer`):
```
Review the plan at {plan_file} for security concerns:
1. Authentication requirements
2. Authorization (role/ownership) checks
3. Input validation strategy
4. SQL injection prevention
5. Sensitive data exposure risks
6. Rate limiting needs

Report: [CRITICAL/HIGH/MEDIUM/LOW] Finding → Recommendation
```

### 2-3. 리뷰 결과 종합 & 수정

CRITICAL/HIGH 이슈가 있으면 플랜 파일을 수정합니다.

### 2-4. 상태 업데이트

`.orchestrate/state.json`의 `phase`를 `"impl"`로 변경.

### 2-5. 자동 진행

```
Phase 2 완료. 전문가 리뷰 결과:
- Schema: {OK / N건 수정}
- Architecture: {OK / N건 수정}
- Code Quality: {OK / N건 수정}
- Security: {OK / N건 수정}

→ /orchestrate 를 호출하면 Phase 3 (병렬 구현)으로 진행합니다.
```

---

## Phase 3: Implement

승인된 플랜을 병렬 에이전트로 구현합니다.

### 3-1. 플랜 로드

`.orchestrate/state.json`에서 `plan_file` 경로를 읽어 플랜을 로드합니다.

### 3-2. Phase 1: Domain + Infrastructure (병렬)

**Agent 1 — Domain Layer:**
```
Implement Phase 1 from {plan_file}:
1. Entity (private constructor + create/reconstitute, getters only)
2. Repository Interface (Symbol token, method signatures)
3. Domain Error (extends DomainError, HTTP status code)
Add index.ts exports.
```

**Agent 2 — Infrastructure Layer:**
```
Implement Phase 2 from {plan_file}:
1. Mapper (toDomain: DB Row → Entity, toPersistence: Entity → DB Insert)
2. Repository Impl (Drizzle conditional array pattern, use Mapper)
Add index.ts exports.
Note: Wait for Agent 1's Interface to complete first if needed.
```

### 3-3. Phase 2: Application Layer (Phase 1 완료 후)

**Agent 3 — Application Layer:**
```
Implement Phase 3-4 from {plan_file}:
1. Use Case (exec(input): Promise<output>, @Transactional, DI with Symbol)
2. Controller (@ApiTags, @ApiOperation, plainToInstance)
3. DTOs (Request: class-validator, Response: @Expose)
4. Module registration (Provider bindings, Exports)
5. E2E Test (success cases, error cases: 400, 401, 404, 409)
```

### 3-4. 통합 검증

```bash
pnpm biome check --write .
pnpm build
pnpm test:e2e:gifca
```

빌드 실패 시 빌드 에러 수정.

### 3-5. 상태 업데이트

`.orchestrate/state.json`의 `phase`를 `"done"`으로 변경.

### 3-6. 자동 진행

```
Phase 3 완료. 구현이 완료되었습니다.
- Build: {pass/fail}
- E2E Test: {N/N pass}

→ /orchestrate 를 호출하면 Phase 4 (검증 + PR)로 진행합니다.
```

---

## Phase 4: Done

검증, 리뷰, PR 생성을 수행합니다.

### 4-1. 검증 루프

모든 체크가 통과할 때까지 반복. **루프를 빠져나오기 전에 4-2로 가지 마세요.**

```
LOOP (max 3):
  1. pnpm biome check --write .
  2. pnpm build          → 실패 시: 수정, LOOP 재시작
  3. pnpm test:e2e:gifca → 실패 시: 원인 분석 후 수정, LOOP 재시작
  4. All green → EXIT LOOP
```

3회 후에도 실패하면 사용자에게 보고하고 중단합니다.

### 4-2. 코드 리뷰 (병렬)

2개 에이전트 동시 실행:

- **security-reviewer**: 인증/인가, 입력 검증, SQL injection, 민감 데이터
- **code-reviewer**: 헥사고날 아키텍처, 네이밍, 에러 처리, 코드 중복

CRITICAL/HIGH 이슈 발견 시 수정 후 **검증 루프(4-1) 재실행**.

### 4-3. Commit

```bash
git add {specific files}
git commit -m "$(cat <<'EOF'
feat({scope}): {description}

- {change 1}
- {change 2}

JIRA: {JIRA-KEY}
EOF
)"
```

Standalone 모드: JIRA 줄 생략

### 4-4. PR 생성

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

### 4-5. Jira 상태 변경 (Jira 모드)

```typescript
mcp__jira__jira_transition_issue({ issue_key: "{JIRA-KEY}", transition: "In Review" })
```

### 4-6. 상태 업데이트 & 정리 안내

`.orchestrate/state.json`의 `phase`를 `"complete"`로 변경.

```markdown
## Development Complete

### Verification
- Biome: pass
- Build: pass
- E2E Test: {N/N} pass
- Security Review: no issues
- Code Review: no issues

### Pull Request
- **URL**: {PR URL}
- **Title**: feat({scope}): {description} {JIRA-KEY}
- **Branch**: {branch} → main

### Cleanup (PR 머지 후)
- Worktree: `git gtr rm {branch} --delete-branch --yes`
- Branch: `git checkout main && git pull && git branch -d {branch}`
```

---

## Examples

```
/orchestrate 1:1 문의 기능 추가
```
→ Phase 1 시작 (Jira 확인 → Q&A → worktree → 플랜)

```
/orchestrate
```
→ 현재 phase 감지하여 자동 진행

```
/orchestrate GIFCA-123
```
→ Jira 이슈 기반으로 Phase 1 시작
