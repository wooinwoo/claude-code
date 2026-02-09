---
description: React feature development pipeline. Auto-detects current phase from state file and continues.
---

# Orchestrate — React/Next.js Pipeline

단일 커맨드로 전체 개발 사이클을 관리합니다.
`.orchestrate/state.json`으로 현재 단계를 추적하며, `/orchestrate`를 반복 호출하면 자동으로 다음 단계로 진행합니다.

## Phase Detection

**먼저 `.orchestrate/state.json` 파일을 확인합니다.**

- 파일 없음 → **Phase 1: Start**
- `"phase": "review"` → **Phase 2: Review**
- `"phase": "impl"` → **Phase 3: Implement**
- `"phase": "done"` → **Phase 4: Done**
- `"phase": "complete"` → 이미 완료됨. 새로 시작하려면 `/orchestrate <새 기능>`

**인자가 있으면** (예: `/orchestrate 상품 검색 페이지`) 항상 Phase 1부터 시작합니다 (기존 state 덮어쓰기).

---

## Phase 1: Start

요구사항 확인 → 브랜치 생성 → 플랜 작성

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
- **UI/UX 명세** — 어떤 화면? 어떤 인터랙션?
- **데이터 흐름** — API 엔드포인트, 요청/응답 형태
- **상태 관리** — 전역/로컬 상태, 캐싱 전략
- **에러 처리** — 로딩, 에러, 빈 상태 UI
- **반응형** — 모바일/태블릿/데스크톱

### 1-3. Jira 이슈 생성 (필요시)

> 이미 이슈가 있거나 standalone이면 스킵

### 1-4. 브랜치 생성

```bash
# Jira 모드
git checkout -b {JIRA-KEY}-{feature-slug}

# Standalone 모드
git checkout -b feature/{feature-slug}
```

### 1-5. 플랜 작성

`plans/{identifier}.md` 생성:

```markdown
# Implementation Plan: {feature name}

## Tracking
- Issue: {JIRA-KEY 또는 branch name}

## Requirements Summary
{Q&A 결과 정리}

## Component Architecture

### Pages / Routes
- [ ] {PageName} — {설명}

### Components
- [ ] {ComponentName} — {역할}

### Hooks / State
- [ ] {useHookName} — {목적}

### API Integration
- [ ] {endpoint} — {method} {request/response}

## Implementation Phases

### Phase 1: 데이터 레이어
1. API 타입 정의
2. API 훅 구현 (SWR/TanStack Query)
3. 상태 관리 설계

### Phase 2: UI 컴포넌트
4. 레이아웃 / 페이지 컴포넌트
5. 공통 컴포넌트
6. 인터랙션 컴포넌트

### Phase 3: 통합 & 테스트
7. 페이지에 컴포넌트 조립
8. 에러/로딩 처리
9. 테스트 작성

## Parallel Agent Assignment

| Agent | Scope | Files |
|-------|-------|-------|
| Agent 1 | Data Layer | API 타입, hooks, store |
| Agent 2 | UI Components | 컴포넌트, 스타일 |
| Agent 3 | Integration & Test | 페이지 조립, 테스트 |
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
  "phase": "review",
  "started_at": "{ISO timestamp}"
}
```

### 1-7. 자동 진행

사용자에게 알림:

```
Phase 1 완료. 플랜이 작성되었습니다.
→ /orchestrate 를 호출하면 Phase 2 (전문가 리뷰)로 진행합니다.
```

---

## Phase 2: Review

4명의 전문가 에이전트가 병렬로 플랜을 리뷰합니다.

### 2-1. 플랜 파일 읽기

`.orchestrate/state.json`에서 `plan_file` 경로를 읽어 플랜을 로드합니다.

### 2-2. 4명의 전문가 병렬 리뷰

Task tool로 4개 에이전트 동시 실행:

**Agent 1 — React Patterns Expert** (`react-reviewer`):
```
Review the plan at {plan_file} for React best practices:
1. Component 분리 적절성 (Single Responsibility)
2. Hooks 사용 패턴 (커스텀 훅 추출 시점, 의존성 관리)
3. Props drilling vs Context vs Store 선택
4. Server Component vs Client Component 경계
5. 접근성(a11y) 고려 여부
6. 재사용 가능한 컴포넌트 식별
7. 네이밍 컨벤션

Report: [CRITICAL/HIGH/MEDIUM/LOW] Finding → Recommendation
```

**Agent 2 — Performance Expert** (`performance-reviewer`):
```
Review the plan at {plan_file} for performance concerns:
1. 렌더링 최적화 전략 (memo, useMemo, useCallback 필요성)
2. 코드 스플리팅 / dynamic import 기회
3. 이미지 최적화 (next/image, lazy loading)
4. 데이터 페칭 전략 (캐싱, 프리페칭, 워터폴 방지)
5. 번들 사이즈 영향 (의존성 선택)
6. Core Web Vitals 영향 (LCP, INP, CLS)
7. 가상화 필요 여부 (대규모 리스트)

Report: [CRITICAL/HIGH/MEDIUM/LOW] Finding → Recommendation
```

**Agent 3 — Security Expert** (`security-reviewer`):
```
Review the plan at {plan_file} for security concerns:
1. XSS 방어 (dangerouslySetInnerHTML, URL 파라미터)
2. 인증/인가 체크 (라우트 보호, API 호출 시)
3. 민감 데이터 노출 (클라이언트 번들에 비밀 포함 여부)
4. CSRF 방어 전략
5. 입력 검증 (폼 데이터, 쿼리 파라미터)
6. 의존성 보안 (known vulnerabilities)
7. 환경변수 관리 (NEXT_PUBLIC_ prefix 주의)

Report: [CRITICAL/HIGH/MEDIUM/LOW] Finding → Recommendation
```

**Agent 4 — Architecture Expert** (`architect`):
```
Review the plan at {plan_file} for architectural fitness:
1. 폴더 구조 일관성 (기존 프로젝트 패턴 준수)
2. 관심사 분리 (UI ↔ 로직 ↔ 데이터)
3. 상태 관리 전략 적절성
4. API 레이어 추상화 수준
5. 에러 바운더리 전략
6. 확장성 (기능 추가 시 변경 범위)
7. 기존 코드와의 일관성

Report: [CRITICAL/HIGH/MEDIUM/LOW] Finding → Recommendation
```

### 2-3. 리뷰 결과 종합 & 수정

CRITICAL/HIGH 이슈가 있으면 플랜 파일을 수정합니다.

### 2-4. 상태 업데이트

`.orchestrate/state.json`의 `phase`를 `"impl"`로 변경.

### 2-5. 자동 진행

```
Phase 2 완료. 전문가 리뷰 결과:
- React Patterns: {OK / N건 수정}
- Performance: {OK / N건 수정}
- Security: {OK / N건 수정}
- Architecture: {OK / N건 수정}

→ /orchestrate 를 호출하면 Phase 3 (병렬 구현)으로 진행합니다.
```

---

## Phase 3: Implement

승인된 플랜을 병렬 에이전트로 구현합니다.

### 3-1. 플랜 로드

`.orchestrate/state.json`에서 `plan_file` 경로를 읽어 플랜을 로드합니다.

### 3-2. Phase 1: 데이터 레이어 + UI 기초 (병렬)

**Agent 1 — Data Layer:**
```
Implement Phase 1 from {plan_file}:
1. API 타입 정의 (TypeScript)
2. API 훅 구현 (SWR 또는 TanStack Query)
3. 상태 관리 (Context 또는 Store 설정)
기존 프로젝트의 패턴을 따르세요.
```

**Agent 2 — UI Components:**
```
Implement Phase 2 from {plan_file}:
1. 공통 컴포넌트 (Props 타입, 스타일링, a11y)
2. 페이지 컴포넌트 (레이아웃, 로딩/에러/빈 상태 UI, 반응형)
기존 프로젝트의 컴포넌트 패턴을 따르세요.
Server/Client Component 경계를 명확히 하세요.
```

### 3-3. Phase 2: 통합 + 테스트 (Phase 1 완료 후)

**Agent 3 — Integration & Test:**
```
Implement Phase 3 from {plan_file}:
1. 페이지 조립 (컴포넌트 + 데이터 훅 연결, 라우팅, 에러 바운더리)
2. 테스트 작성 (RTL 컴포넌트 테스트, renderHook, 인터랙션 테스트)
```

### 3-4. 통합 검증

```bash
pnpm lint
pnpm build
pnpm test
```

빌드 실패 시 "빌드 에러 고쳐줘"로 수정.

### 3-5. 상태 업데이트

`.orchestrate/state.json`의 `phase`를 `"done"`으로 변경.

### 3-6. 자동 진행

```
Phase 3 완료. 구현이 완료되었습니다.
- Build: {pass/fail}
- Test: {N/N pass}

→ /orchestrate 를 호출하면 Phase 4 (검증 + PR)로 진행합니다.
```

---

## Phase 4: Done

검증, 리뷰, PR 생성을 수행합니다.

### 4-1. 검증 루프

모든 체크가 통과할 때까지 반복. **루프를 빠져나오기 전에 4-2로 가지 마세요.**

```
LOOP (max 3):
  1. pnpm lint --fix
  2. pnpm build          → 실패 시: 빌드 에러 수정, LOOP 재시작
  3. pnpm test           → 실패 시: 원인 분석 후 수정, LOOP 재시작
  4. All green → EXIT LOOP
```

3회 후에도 실패하면 사용자에게 보고하고 중단합니다.

### 4-2. 전문가 리뷰 (병렬)

3개 에이전트 동시 실행:

- **react-reviewer**: Hooks 규칙, Component 패턴, Props 타입, a11y
- **performance-reviewer**: 불필요한 re-render, 번들 사이즈, 데이터 페칭
- **security-reviewer**: XSS, 인증/인가, 민감 데이터, 입력 검증

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
## Summary
{what was built and why}

## Changes
- {change 1}
- {change 2}

## Test
- [x] Unit tests added
- [x] Build passes
- [x] Lint passes

## Review Notes
- React Patterns: OK
- Performance: OK
- Security: OK
EOF
)"
```

### 4-5. Jira 상태 변경 (Jira 모드)

```typescript
mcp__jira__jira_transition_issue({ issue_key: "{JIRA-KEY}", transition: "In Review" })
```

### 4-6. 상태 업데이트

`.orchestrate/state.json`의 `phase`를 `"complete"`로 변경.

### 4-7. 완료 보고

```markdown
## Development Complete

### Verification
- Lint: pass
- Build: pass
- Test: {N/N} pass

### Expert Reviews
- React Patterns: no issues
- Performance: no issues
- Security: no issues

### Pull Request
- **URL**: {PR URL}
- **Title**: feat({scope}): {description} {JIRA-KEY}
- **Branch**: {branch} → main
```

---

## Examples

```
/orchestrate 상품 검색 페이지 만들어야 해. 필터링, 정렬, 무한스크롤.
```
→ Phase 1 시작 (Jira 확인 → Q&A → 브랜치 → 플랜)

```
/orchestrate
```
→ 현재 phase 감지하여 자동 진행

```
/orchestrate PROJ-123
```
→ Jira 이슈 기반으로 Phase 1 시작
