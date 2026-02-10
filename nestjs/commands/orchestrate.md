---
description: NestJS feature pipeline with worktree isolation. Plan → Branch → Develop → Merge & PR.
---

# Orchestrate — NestJS Pipeline

## Usage

```
/orchestrate 1:1 문의 기능 추가
/orchestrate GIFCA-123
/orchestrate                → 현재 phase 감지 후 자동 진행
```

## Pipeline Detection

**`.orchestrate/` 디렉토리의 `{slug}.json` 파일로 파이프라인을 추적합니다.**

여러 기능을 동시에 진행할 수 있습니다 (기능별 state 파일 분리).

### 파이프라인 선택

| 상황 | 동작 |
|------|------|
| `/orchestrate 문의 기능` | 새 파이프라인 시작 → `.orchestrate/{slug}.json` 생성 |
| `/orchestrate` + state 1개 | 그 파이프라인 이어감 |
| `/orchestrate` + state 여러개 | 현재 브랜치(`git branch --show-current`)로 매칭. 못 찾으면 목록 → AskUserQuestion |
| `/orchestrate` + state 0개 | "진행 중인 파이프라인 없음. 인자를 지정하세요." |

### Phase 감지

state 파일의 `phase` 값:

- `"branch"` → **Phase 2: Branch**
- `"develop"` → **Phase 3: Develop**
- `"done"` → **Phase 4: PR**
- `"pr"` → **Phase 5: Feedback**
- `"complete"` → **Phase 6: Clean**

```
Phase 1: Plan     → 사용자와 플랜 협업 → 승인
                    ↓ 자동 연결 (승인 후 멈추지 않고 계속)
Phase 2: Branch   → 워크트리 + 브랜치 생성
                    ↓ 자동 연결
Phase 3: Develop  → 워크트리에서 구현
                    ↓ 자동 연결
Phase 4: PR       → 검증 → 에이전트 리뷰 → 커밋 → PR 생성
                    ■ 여기서 정지 (리뷰 대기)
Phase 5: Feedback → PR 코멘트 반영 (반복)   ← /orchestrate 수동 호출
Phase 6: Clean    → PR 병합 확인 → 워크트리/브랜치 삭제
```

### 자동 연결 규칙

Phase 1 승인 후 **Phase 2→3→4를 한 번에 실행**합니다. 중간에 멈추지 않습니다.
사용자 입력이 필요한 시점은 **Phase 1 (플랜 승인)**과 **Phase 5 (리뷰 피드백)** 뿐입니다.

state 파일의 phase 값은 **세션 복구용**입니다. 세션이 중간에 끊기면 `/orchestrate`로 해당 phase부터 이어갑니다.

---

## Phase 1: Plan

사용자와 함께 기능 플랜을 작성합니다.

### 1-0. 권한 사전 요청

**파이프라인 시작 시 필요한 모든 권한을 한 번에 요청합니다:**

```typescript
// Phase 2-6에서 사용할 모든 git/bash 명령어 권한 사전 요청
// 사용자가 한 번만 승인하면 이후 자동 진행
allowedPrompts: [
  { tool: "Bash", prompt: "git operations (add, commit, push, checkout, branch, worktree)" },
  { tool: "Bash", prompt: "build and validation (pnpm install, biome check, build, test)" },
  { tool: "Bash", prompt: "GitHub CLI operations (gh pr create, view)" },
  { tool: "Bash", prompt: "file operations (cp, mv, rm, mkdir)" }
]
```

### 1-1. Jira 확인

```
기존 Jira 이슈가 있나요?
- Yes: 이슈 키 입력 (예: GIFCA-123)
- No: 새로 생성
- Standalone: Jira 없이 진행
```

### 1-2. 요구사항 Q&A

AskUserQuestion으로 핵심을 명확히:

- **목적과 사용자 가치**
- **API 엔드포인트 스펙** — method, path, request/response
- **비즈니스 규칙과 검증 로직**
- **에러 처리 시나리오**
- **외부 서비스 연동**

### 1-3. Jira 이슈 생성 (필요시)

> 이미 이슈가 있거나 standalone이면 스킵

### 1-4. 플랜 작성

`plans/{identifier}.md` 생성:

```markdown
# {feature name}

## Tracking
- Issue: {JIRA-KEY 또는 standalone}

## Requirements
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

## Implementation Order
1. Entity + Repository Interface + Domain Error
2. Mapper + Repository Impl (Drizzle)
3. Use Case (@Transactional, DI with Symbol)
4. Controller + DTOs + Module registration
5. E2E Test
```

### 1-5. 플랜 검증 에이전트

플랜을 사용자에게 보여주기 전에, **2개의 Task tool을 병렬 호출**하여 플랜을 검증합니다:

```
Task A — Feasibility Review (subagent_type: general-purpose) — 필수
prompt: "다음 구현 플랜을 검토해줘: {plan 내용}
프로젝트 경로: {project_path}
기존 코드베이스를 읽고, 이 플랜이 기술적으로 타당한지 점검해줘.
체크 항목:
- 기존 코드와 충돌하는 설계가 있는지
- 누락된 의존성이나 선행 작업이 있는지
- 기술적으로 불가능하거나 비효율적인 접근이 있는지
- DB 스키마 변경이 필요한지 (마이그레이션)
- 더 나은 대안이 있는지
리스크가 있으면 구체적으로 알려줘."

Task B — Impact Analysis (subagent_type: general-purpose) — 필수
prompt: "다음 구현 플랜이 기존 코드에 미치는 영향을 분석해줘: {plan 내용}
프로젝트 경로: {project_path}
체크 항목:
- 변경이 필요한 기존 파일 목록과 신규 생성 파일
- 영향받는 기존 API 엔드포인트
- 영향받는 기존 모듈/서비스/Use Case
- DB 영향 (테이블 변경, 마이그레이션, 인덱스)
- 사이드 이펙트 가능성 (E2E 테스트, 프론트엔드 영향)
영향 범위를 구체적으로 알려줘."
```

**Feasibility 결과에서 다음 중 하나라도 언급되면, Schema Design 에이전트 추가 호출:**
- "DB 마이그레이션 필요", "테이블 추가/변경", "컬럼 추가/수정/삭제"
- "스키마 변경", "인덱스 추가/변경", "외래키 변경", "제약조건 변경"
- 또는 응답에 "database", "schema", "migration", "table", "column" 키워드 포함

```
Task C — Schema Design Review (subagent_type: general-purpose) — 선택적
prompt: "다음 구현 플랜의 DB 스키마 설계를 검토해줘: {plan 내용}
프로젝트 경로: {project_path}
기존 스키마 파일을 읽고, 다음을 검토해줘:
체크 항목:
- 데이터 모델링: 엔티티 구조, 관계 설정 (1:1, 1:N, N:M)
- 정규화: 중복 제거, 적절한 정규화 수준
- 타입 선택: 컬럼 타입, nullable, default 값
- 제약조건: PK, FK, unique, check 제약
- 인덱스 계획: 쿼리 패턴에 맞는 인덱스
- 네이밍 컨벤션: 테이블/컬럼명 일관성
문제가 있으면 구체적으로 알려줘."
```

검증 결과에 Critical 이슈가 있으면 플랜을 수정한 후 진행합니다.

### 1-6. 사용자 승인

**검증된 플랜을 보여주고 반드시 승인을 받습니다.** 에이전트 검증 결과도 함께 공유합니다.
수정 요청 시 반영 후 재승인.

### 1-7. 상태 저장 → Phase 2로 자동 연결

`.orchestrate/{slug}.json` 생성:

```bash
# 변수 설정 (placeholder를 실제 값으로 치환)
feature_name="1:1 문의 기능"
slug="inquiry"  # feature_name의 kebab-case 버전
jira_key="GIFCA-123"  # 또는 standalone이면 "null"
identifier="${jira_key}-${slug}"  # 또는 standalone이면 "${slug}"

mkdir -p .orchestrate
cat > ".orchestrate/${slug}.json" <<EOF
{
  "feature": "${feature_name}",
  "jira_key": ${jira_key:+\"$jira_key\"}${jira_key:-null},
  "branch": "${identifier}",
  "plan_file": "plans/${identifier}.md",
  "worktree": ".worktrees/${slug}",
  "phase": "branch",
  "started_at": "$(date -Iseconds)"
}
EOF
```

```
Phase 1 완료. 플랜이 승인되었습니다. Phase 2→3→4를 자동으로 진행합니다.
```

**멈추지 않고 바로 Phase 2를 실행합니다.**

---

## Phase 2: Branch

워크트리와 브랜치를 생성합니다.

### 2-1. Feature 브랜치 + 워크트리 생성

```bash
# 브랜치 생성 + 워크트리로 체크아웃
git worktree add .worktrees/{slug} -b {branch-name}
```

### 2-2. 의존성 설치

```bash
cd .worktrees/{slug}

# .env 파일 복사 (없으면 .env.example 사용)
if [ -f ../.env ]; then
  cp ../.env .env
elif [ -f ../.claude/.env.example ]; then
  cp ../.claude/.env.example .env
  echo "⚠️  .env.example을 복사했습니다. 토큰을 입력하세요."
fi

pnpm install
```

### 2-3. 플랜 파일 복사

```bash
cp -r plans/ .worktrees/{slug}/plans/
```

### 2-4. 상태 업데이트 → Phase 3로 자동 연결

```bash
# state 파일의 phase 값을 "develop"으로 업데이트
jq '.phase = "develop"' .orchestrate/{slug}.json > .orchestrate/{slug}.json.tmp && mv .orchestrate/{slug}.json.tmp .orchestrate/{slug}.json
```

**멈추지 않고 바로 Phase 3를 실행합니다.**

---

## Phase 3: Develop

**워크트리 디렉토리에서** 플랜에 따라 구현합니다.

### 3-1. 작업 디렉토리 확인

state 파일에서 `worktree` 경로를 읽어 해당 디렉토리에서 작업합니다.

### 3-2. 구현

플랜의 Implementation Order에 따라:

1. **Domain Layer** — Entity (private constructor + create/reconstitute), Repository Interface (Symbol token), Domain Error
2. **Infrastructure Layer** — Mapper (toDomain/toPersistence), Repository Impl (Drizzle)
3. **Application Layer** — Use Case (@Transactional), Controller + DTOs, Module registration
4. **Test** — E2E test (success + error cases: 400, 401, 404, 409)

> Domain + Infra는 독립적이므로 Task tool로 병렬 실행 가능.
> Application은 Domain/Infra 완료 후 진행.

### 3-3. 워크트리 내 검증

```bash
cd .worktrees/{slug}
```

**검증 루프 실행 (최대 3회 시도):**

```
attempt = 0

while attempt < 3:
  attempt++

  1. pnpm biome check --write .
     → 실패 시: 에러 수정 → 처음부터 재시작 (continue)

  2. pnpm build
     → 실패 시: 에러 수정 → 처음부터 재시작 (continue)

  3. pnpm test:e2e:gifca
     → 실패 시: 에러 수정 → 처음부터 재시작 (continue)

  4. 모두 성공 → 루프 종료 (break)

if attempt == 3:
  에러 로그 출력
  "검증 3회 실패. 다음 에러를 확인하세요: [마지막 에러]"
  Phase 중단 (다음 Phase로 넘어가지 않음)
```

### 3-4. 상태 업데이트 → Phase 4로 자동 연결

```bash
# 메인 프로젝트 루트로 이동 후 state 파일 업데이트
cd ../..
jq '.phase = "done"' .orchestrate/{slug}.json > .orchestrate/{slug}.json.tmp && mv .orchestrate/{slug}.json.tmp .orchestrate/{slug}.json
```

**멈추지 않고 바로 Phase 4를 실행합니다.**

---

## Phase 4: PR

검증 후 PR을 생성합니다.

### 4-1. 워크트리에서 검증 루프

```bash
cd .worktrees/{slug}
```

**검증 루프 실행 (최대 3회 시도):**

```
attempt = 0

while attempt < 3:
  attempt++

  1. pnpm biome check --write .
     → 실패 시: 에러 수정 → 처음부터 재시작 (continue)

  2. pnpm build
     → 실패 시: 에러 수정 → 처음부터 재시작 (continue)

  3. pnpm test:e2e:gifca
     → 실패 시: 에러 수정 → 처음부터 재시작 (continue)

  4. 모두 성공 → 루프 종료 (break)

if attempt == 3:
  에러 로그 출력
  "검증 3회 실패. 다음 에러를 확인하세요: [마지막 에러]"
  Phase 중단 (다음 Phase로 넘어가지 않음)
```

### 4-2. 에이전트 선별 및 병렬 리뷰

커밋 전 변경 파일을 분석하고, 해당되는 에이전트만 선별하여 병렬 실행합니다.

**Step 1: 변경 파일 확인**

```bash
git diff --name-only HEAD
```

**Step 2: 에이전트 선별**

변경된 파일 목록을 보고 아래 기준에 따라 투입할 에이전트를 결정합니다:

| 에이전트 | 구분 | 투입 조건 | 전담 영역 (다른 에이전트와 겹치지 않음) |
|---------|------|----------|--------------------------------------|
| **Code Review** | 필수 | 항상 | 가독성, 중복 코드, 함수/파일 크기, 에러 처리 |
| **Convention** | 필수 | 항상 | 네이밍, 레이어/폴더 구조, import 패턴, 프로젝트 규칙 (CLAUDE.md + rules/) |
| **Security** | 선택 | guard, auth, controller, 사용자 입력 처리 파일 변경 시 | injection, 인증/인가 우회, 민감정보 노출, API 보안, 의존성 취약점 (DTO 검증 제외) |
| **Database** | 선택 | repository, schema, migration, query 파일 변경 시 | N+1 쿼리, 인덱스, 트랜잭션, 데드락, 쿼리 최적화 |
| **NestJS Pattern** | 선택 | module, controller, service, dto, use-case 파일 변경 시 | DI 패턴, 모듈 구조, DTO 검증, Guard/Filter/Interceptor, 레이어 분리 |

**Step 3: 선별된 에이전트를 하나의 응답에서 병렬 호출**

> **중요: 선별된 모든 Task를 한 번의 응답에 모두 포함해서 병렬 실행하세요.**

**❌ 잘못된 예시 (순차 실행):**
```
1. Code Review Task 호출 → 결과 대기
2. 결과 확인 후 Convention Task 호출 → 결과 대기
3. 결과 확인 후 Security Task 호출
```

**✅ 올바른 예시 (병렬 실행):**
```
한 번의 응답에 3개 Task tool을 모두 포함:
- Task: Code Review
- Task: Convention Review
- Task: Security Review

(3개가 동시에 실행되고, 모든 결과를 한 번에 수집)
```

각 에이전트의 Task tool 호출 형식:

```
Code Review (subagent_type: general-purpose) — 필수
prompt: "워크트리 {worktree_path}의 다음 변경 파일들을 리뷰해줘: {file_list}
전담 영역: 가독성, 중복 코드, 함수/파일 크기, 에러 처리.
제외 (다른 에이전트 담당): 네이밍 컨벤션, 보안, DB, NestJS 패턴.
심각도(Critical/High/Medium/Low)와 파일:라인 위치를 포함해서 리포트해줘."

Convention Review (subagent_type: general-purpose) — 필수
prompt: "워크트리 {worktree_path}의 다음 변경 파일들을 프로젝트 컨벤션 점검해줘: {file_list}
CLAUDE.md와 .claude/rules/ 에 정의된 프로젝트 규칙을 읽고 준수 여부를 확인해줘.
전담 영역: 네이밍, 레이어/폴더 구조, import 패턴, 프로젝트 특화 규칙.
심각도(Critical/High/Medium/Low)와 파일:라인 위치를 포함해서 리포트해줘."

Security Review (subagent_type: general-purpose) — 선택
prompt: "워크트리 {worktree_path}의 다음 변경 파일들을 보안 점검해줘: {file_list}
전담 영역: injection(SQL, NoSQL, command), 인증/인가 우회, 민감정보 노출, API 보안, 의존성 취약점.
제외 (NestJS Pattern 담당): DTO 검증 로직.
심각도(Critical/High/Medium/Low)와 파일:라인 위치를 포함해서 리포트해줘."

Database Review (subagent_type: general-purpose) — 선택
prompt: "워크트리 {worktree_path}의 다음 변경 파일들을 DB 관점에서 점검해줘: {file_list}
전담 영역: N+1 쿼리, 인덱스 누락, 트랜잭션 범위, 데드락 가능성, 쿼리 최적화.
심각도(Critical/High/Medium/Low)와 파일:라인 위치를 포함해서 리포트해줘."

NestJS Pattern Review (subagent_type: general-purpose) — 선택
prompt: "워크트리 {worktree_path}의 다음 변경 파일들을 NestJS 패턴 점검해줘: {file_list}
전담 영역: DI 패턴(Symbol token), 모듈 구조, DTO 검증(class-validator), Guard/Filter/Interceptor 사용, 레이어 분리(Domain/Infra/Application).
제외 (Convention 담당): 네이밍, 파일 구조 컨벤션.
심각도(Critical/High/Medium/Low)와 파일:라인 위치를 포함해서 리포트해줘."
```

**결과 처리:**
- **Critical/High** → 즉시 수정 후 4-1 재실행
- **Medium** → 수정 후 진행
- **Low/Info** → PR description의 "에이전트 리뷰 결과" 섹션에 기록, 진행

### 4-3. 커밋

```bash
git add {specific files}
git commit -m "{type}({scope}): {description}"
```

### 4-4. PR 생성

```bash
git push -u origin {branch}

gh pr create --title "{type}({scope}): {description}" --body "$(cat <<'EOF'
<!-- PR 작성 가이드:
- 모든 {placeholder}를 실제 값으로 치환하세요
- 필수 섹션: 개요, 주요 변경사항, 핵심 구현, API 스펙, 테스트
- 선택 섹션 (해당 시만 포함):
  * DB 변경사항 (스키마 변경 시)
  * 변경 전/후 비교 (리팩토링 시)
- 해당 없는 섹션은 제거하고, "해당 없음"으로 남기지 마세요
-->

## 개요
{이 PR이 왜 필요한지 1-2문장}

## 주요 변경사항

### 신규 파일
| 파일 | 레이어 | 역할 |
|------|--------|------|
| `src/path/to/entity.ts` | Domain | {역할 설명} |
| `src/path/to/repository.ts` | Infra | {역할 설명} |
| `src/path/to/use-case.ts` | Application | {역할 설명} |

### 수정 파일
| 파일 | 변경 내용 |
|------|----------|
| `src/path/to/module.ts` | {무엇을 왜 변경했는지} |

## 핵심 구현

### Entity 설계
\`\`\`typescript
// src/domain/{entity}/{entity}.entity.ts (핵심 메서드만)
class {EntityName} {
  private constructor(
    public readonly id: {Id},
    private _field: {Type},
  ) {}

  static create(params: Create{Name}Params): Result<{EntityName}> {
    // 도메인 규칙 검증 로직
  }

  public method(): Result<void> {
    // 비즈니스 로직
  }
}
\`\`\`

### Use Case 흐름
\`\`\`typescript
// src/application/{usecase}/{action}.use-case.ts
@Transactional()
async execute(dto: {Action}Dto): Promise<{Response}Dto> {
  // 1. 선행 조건 검증 (사용자/권한/리소스 존재 확인)
  // 2. 도메인 Entity 생성/수정
  // 3. Repository 저장
  // 4. 이벤트 발행 (필요 시)
  // 5. 응답 DTO 생성
}
\`\`\`

## 처리 흐름

\`\`\`
[요청] → [DTO 검증] → [선행 조건 확인] → [도메인 로직]
   ↓         ↓ 실패: 400       ↓ 실패: 404/409     ↓
[트랜잭션 시작]                              [Entity 생성/수정]
   ↓                                             ↓
[DB 저장] → [이벤트 발행] → [커밋] → [응답 201/200]
\`\`\`

## API 스펙

### 성공 케이스
**Request:**
\`\`\`bash
{METHOD} /api/v1/{resource}
Content-Type: application/json

{
  "field": "value"
}
\`\`\`

**Response ({status}):**
\`\`\`json
{
  "id": "...",
  "field": "value",
  "createdAt": "2026-02-10T12:34:56Z"
}
\`\`\`

### 에러 케이스
| Status | Error Code | 설명 | 응답 예시 |
|--------|------------|------|----------|
| 400 | `VALIDATION_ERROR` | DTO 검증 실패 | `{"error": "VALIDATION_ERROR", "message": "..."}` |
| 401 | `UNAUTHORIZED` | 인증 실패 | `{"error": "UNAUTHORIZED"}` |
| 404 | `{RESOURCE}_NOT_FOUND` | 리소스 없음 | `{"error": "USER_NOT_FOUND"}` |
| 409 | `{RESOURCE}_CONFLICT` | 중복/상태 충돌 | `{"error": "ALREADY_EXISTS"}` |

## DB 변경사항

### 신규 테이블/컬럼
\`\`\`sql
-- 신규 테이블 (또는 ALTER TABLE ...)
CREATE TABLE {table_name} (
  id VARCHAR(255) PRIMARY KEY,
  field VARCHAR(500) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  INDEX idx_{field} ({field}),
  FOREIGN KEY (fk_id) REFERENCES {ref_table}(id)
);
\`\`\`

### 인덱스 전략
- `idx_{field}`: {쿼리 패턴 설명 — 왜 필요한지}
- `idx_composite`: {복합 인덱스 이유}

### 마이그레이션 주의사항
- {데이터 손실 가능성, 롤백 방법, 배포 순서 등}

## 구현 상세

### Domain Layer
- **Entity**: {핵심 비즈니스 규칙 — 불변식, 검증 로직}
- **Repository Interface**: {메서드 시그니처 — findById, save 등}
- **Domain Error**: {커스텀 에러 종류}

### Infrastructure Layer
- **Mapper**: {toDomain/toPersistence 변환 로직 — 특이사항}
- **Repository Impl**: {쿼리 방식 — raw SQL/ORM, JOIN 사용 여부, 인덱스 활용}

### Application Layer
- **Use Case**: {비즈니스 로직 흐름 — 트랜잭션 범위, 이벤트 발행}
- **Controller**: `{METHOD} /api/v1/{path}` — 권한 체크, DTO 검증
- **DTO**: {class-validator 규칙 — @IsString, @Min 등}

## 변경 전/후 비교 (리팩토링 시)

### Before (문제점)
\`\`\`typescript
// {문제 설명 — N+1, 중복 로직, 복잡도 등}
{기존 코드 핵심 부분}
\`\`\`

### After (개선)
\`\`\`typescript
// {개선 내용 — JOIN, 추출, 단순화 등}
{새 코드 핵심 부분}
\`\`\`

### 성능 개선
- {쿼리 횟수, 실행 시간, 메모리 사용량 등 측정 가능한 지표}

## 에이전트 리뷰 결과
- **Code Review**: {요약}
- **Security**: {요약}
- **Database**: {요약}
- **NestJS Pattern**: {요약}
- **Convention**: {요약}

## 테스트

### E2E 테스트
- [x] `pnpm biome check` 통과
- [x] `pnpm build` 통과
- [x] E2E 테스트 추가 ({N}개 케이스)
  - [x] ✅ 성공 케이스 (201/200)
  - [x] ❌ 400 Bad Request (DTO 검증 실패)
  - [x] ❌ 401 Unauthorized (인증 실패)
  - [x] ❌ 404 Not Found (리소스 없음)
  - [x] ❌ 409 Conflict (중복/상태 충돌)
- [x] 기존 테스트 통과

### 테스트 커버리지
- {Entity/UseCase 단위 테스트 여부, 주요 경로 커버리지}

## 참고사항
- {리뷰어가 알아야 할 컨텍스트, 트레이드오프, 후속 작업 등}
- {Breaking Change 여부, API 버전 변경, 마이그레이션 필요 여부}
EOF
)"
```

### 4-5. Jira 상태 변경 (Jira 모드)

```typescript
mcp__jira__jira_transition_issue({ issue_key: "{JIRA-KEY}", transition: "In Review" })
```

### 4-6. 상태 업데이트

```bash
# 프로젝트 루트로 이동
cd ../..

# PR URL 추출 후 state 파일 업데이트
PR_URL=$(gh pr view {branch} --json url -q .url)
jq --arg url "$PR_URL" '.phase = "pr" | .pr_url = $url' .orchestrate/{slug}.json > .orchestrate/{slug}.json.tmp && mv .orchestrate/{slug}.json.tmp .orchestrate/{slug}.json
```

```
Phase 4 완료. PR이 생성되었습니다.
- PR: {URL}
- Branch: {branch} → main

→ 리뷰 코멘트가 달리면 /orchestrate 를 호출하세요.
```

---

## Phase 5: Feedback

PR 리뷰 코멘트를 확인하고 반영합니다. **이 phase는 반복됩니다.**

### 5-1. PR 상태 확인

```bash
gh pr view {branch} --json state,reviews,comments,reviewRequests
```

| 상태 | 행동 |
|------|------|
| `MERGED` | → Phase 6 (Clean)으로 자동 전환 |
| `OPEN` + 코멘트 없음 | → "리뷰 대기 중. 코멘트가 달리면 다시 호출하세요." |
| `OPEN` + 코멘트 있음 | → 아래 5-2~5-5 실행 |
| `CLOSED` | → "PR이 닫혔습니다. 상태를 확인하세요." |

### 5-2. 리뷰 코멘트 읽기

```bash
gh api repos/{owner}/{repo}/pulls/{pr_number}/comments --jq '.[] | {path, line, body, user: .user.login}'
gh api repos/{owner}/{repo}/pulls/{pr_number}/reviews --jq '.[] | {state, body, user: .user.login}'
```

코멘트를 분류:
- **변경 요청** (request changes) → 반드시 반영
- **제안** (suggestion) → 타당하면 반영
- **질문** (question) → 코드에 주석 또는 PR 답글

### 5-3. 워크트리에서 수정

```bash
cd .worktrees/{slug}
# 코멘트 내용에 따라 수정
```

### 5-4. 검증 + push

```bash
pnpm biome check --write . && pnpm build && pnpm test:e2e:gifca
git add {modified files}
git commit -m "fix({scope}): address review feedback"
git push
```

### 5-5. 상태 유지

phase는 `"pr"` 그대로 유지. (다음 리뷰까지 반복 가능)

```
리뷰 피드백 반영 완료. push 했습니다.
- 수정 항목: {N}건
- 리뷰어에게 re-review 요청하세요.

→ 추가 코멘트가 달리면 /orchestrate 를 다시 호출하세요.
→ PR이 병합되면 /orchestrate 로 정리합니다.
```

---

## Phase 6: Clean

PR 병합 확인 후 워크트리와 브랜치를 정리합니다.

> Phase 5에서 PR이 MERGED로 감지되면 자동으로 이 phase를 실행합니다.

### 6-1. 정리 스크립트 실행

**Bash 한 번으로 전부 처리합니다:**

```bash
# .claude 디렉토리에서 정리 스크립트 실행
bash .claude/scripts/orchestrate-clean.sh $(pwd) {slug} {branch}
```

이 스크립트가 자동으로:
0. **PR merge 확인** (안전 장치)
   - PR이 merge 안 됐으면 종료 (작업 내용 보호)
   - merge 됐으면 안전하게 정리 진행
1. main checkout + pull
2. 워크트리 제거 (force + 디렉토리 정리)
3. 로컬 브랜치 삭제
4. 리모트 브랜치 삭제
5. `.orchestrate/{slug}.json` 삭제

**PR이 merge 안 됐을 때:**
- 스크립트가 종료되고 안내 메시지 출력
- PR을 merge하거나, 강제 삭제 명령어 사용

### 6-2. Jira 상태 변경 (Jira 모드)

> standalone이면 스킵

```typescript
mcp__jira__jira_transition_issue({ issue_key: "{JIRA-KEY}", transition: "Done" })
```

### 6-3. 완료

```
정리 완료.
- 워크트리: .worktrees/{slug} 삭제됨
- 브랜치: {branch} 삭제됨 (local + remote)
- Jira: {JIRA-KEY} → Done
- main: 최신 상태로 업데이트됨
```

---

## Examples

```
/orchestrate 1:1 문의 기능 추가. 카테고리 분류, 답변, 상태 관리.
```
→ Phase 1 (플랜) → 승인 후 Phase 2→3→4 자동 실행 → PR 생성 후 정지

```
/orchestrate
```
→ 세션 복구: 중단된 phase부터 이어서 자동 진행

```
/orchestrate GIFCA-123
```
→ Jira 이슈 기반으로 Phase 1 시작

---

## Troubleshooting

### Phase 3: 빌드 실패

**증상**: `pnpm build` 실패, worktree에 갇힘

**복구**:
```bash
# 1. worktree로 이동
cd .worktrees/{slug}

# 2. 에러 수정 후 다시 빌드
pnpm biome check --write .
pnpm build

# 3. 성공하면 /orchestrate 재실행
```

### Phase 4: PR 생성 실패

**증상**: `gh pr create` 실패 (네트워크, 권한 등)

**복구**:
```bash
# 1. 수동으로 PR 생성 가능한지 확인
cd .worktrees/{slug}
gh pr create --title "..." --body "..."

# 2. 또는 /orchestrate 재실행 (자동 재시도)
```

### Worktree 충돌

**증상**: "worktree already exists" 에러

**복구**:
```bash
# 1. worktree 목록 확인
git worktree list

# 2. 문제 worktree 제거
git worktree remove .worktrees/{slug} --force
rm -rf .worktrees/{slug}

# 3. state 파일 삭제
rm .orchestrate/{slug}.json

# 4. 처음부터 다시 시작
/orchestrate {description}
```

### MCP 연결 실패

**증상**: Jira/GitHub MCP 오류

**복구**:
```bash
# 1. .env 토큰 확인
cat .claude/.env

# 2. 토큰 재발급 및 입력
# - GITHUB_PAT: https://github.com/settings/tokens/new
# - JIRA_TOKEN: https://id.atlassian.com/manage-profile/security/api-tokens

# 3. /orchestrate 재실행 (MCP 재연결)
```

### State 파일 손상

**증상**: JSON parse 에러, state 불일치

**복구**:
```bash
# 1. state 파일 확인
cat .orchestrate/{slug}.json

# 2. 수동 수정 또는 삭제
rm .orchestrate/{slug}.json

# 3. 워크트리 수동 정리 후 재시작
git worktree remove .worktrees/{slug}
/orchestrate {description}
```
