---
description: React feature pipeline with worktree isolation. Plan → Branch → Develop → Merge & PR.
---

# Orchestrate — React/Next.js Pipeline

## Usage

```
/orchestrate 상품 검색 페이지. 필터, 정렬, 무한스크롤.
/orchestrate PROJ-123
/orchestrate                → 현재 phase 감지 후 자동 진행
```

## Pipeline Detection

**`.orchestrate/` 디렉토리의 `{slug}.json` 파일로 파이프라인을 추적합니다.**

여러 기능을 동시에 진행할 수 있습니다 (기능별 state 파일 분리).

### 파이프라인 선택

| 상황 | 동작 |
|------|------|
| `/orchestrate 검색 페이지` | 새 파이프라인 시작 → `.orchestrate/{slug}.json` 생성 |
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

### 1-1. Jira 확인

```
기존 Jira 이슈가 있나요?
- Yes: 이슈 키 입력 (예: PROJ-123)
- No: 새로 생성
- Standalone: Jira 없이 진행
```

### 1-2. 요구사항 Q&A

AskUserQuestion으로 핵심을 명확히:

- **목적과 사용자 가치**
- **UI/UX 명세** — 화면, 인터랙션
- **데이터 흐름** — API 엔드포인트, 요청/응답
- **상태 관리** — 전역/로컬, 캐싱 전략
- **에러/로딩/빈 상태** UI
- **반응형** — 모바일/태블릿/데스크톱

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

## Architecture

### Pages / Routes
- [ ] {PageName} — {설명}

### Components
- [ ] {ComponentName} — {역할}

### Hooks / State
- [ ] {useHookName} — {목적}

### API Integration
- [ ] {endpoint} — {method} {req/res}

## Implementation Order
1. API 타입 + hooks
2. 공통 컴포넌트
3. 페이지 컴포넌트 + 조립
4. 에러/로딩 처리
5. 테스트
```

### 1-5. 플랜 검증 에이전트

플랜을 사용자에게 보여주기 전에, **2개의 Task tool을 병렬 호출**하여 플랜을 검증합니다:

```
Task A — Feasibility Review (subagent_type: general-purpose)
prompt: "다음 구현 플랜을 검토해줘: {plan 내용}
프로젝트 경로: {project_path}
기존 코드베이스를 읽고, 이 플랜이 기술적으로 타당한지 점검해줘.
체크 항목:
- 기존 코드와 충돌하는 설계가 있는지
- 누락된 의존성이나 선행 작업이 있는지
- 기술적으로 불가능하거나 비효율적인 접근이 있는지
- 더 나은 대안이 있는지
리스크가 있으면 구체적으로 알려줘."

Task B — Impact Analysis (subagent_type: general-purpose)
prompt: "다음 구현 플랜이 기존 코드에 미치는 영향을 분석해줘: {plan 내용}
프로젝트 경로: {project_path}
체크 항목:
- 변경이 필요한 기존 파일 목록과 신규 생성 파일
- 영향받는 기존 페이지/컴포넌트/hooks
- 사이드 이펙트 가능성 (기존 테스트, UI 동작, 공유 타입/유틸 파급)
영향 범위를 구체적으로 알려줘."
```

검증 결과에 Critical 이슈가 있으면 플랜을 수정한 후 진행합니다.

### 1-6. 사용자 승인

**검증된 플랜을 보여주고 반드시 승인을 받습니다.** 에이전트 검증 결과도 함께 공유합니다.
수정 요청 시 반영 후 재승인.

### 1-6. 상태 저장 → Phase 2로 자동 연결

`.orchestrate/{slug}.json`:

```json
{
  "feature": "{name}",
  "jira_key": "{KEY or null}",
  "branch": "{JIRA-KEY}-{slug} or feature/{slug}",
  "plan_file": "plans/{identifier}.md",
  "worktree": ".worktrees/{slug}",
  "phase": "branch",
  "started_at": "{ISO}"
}
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
cd .worktrees/{slug} && pnpm install
```

### 2-3. 플랜 파일 복사

워크트리에서도 플랜을 참조할 수 있도록:

```bash
cp -r plans/ .worktrees/{slug}/plans/
```

### 2-4. 상태 업데이트 → Phase 3로 자동 연결

phase → `"develop"`

**멈추지 않고 바로 Phase 3를 실행합니다.**

---

## Phase 3: Develop

**워크트리 디렉토리에서** 플랜에 따라 구현합니다.

### 3-1. 작업 디렉토리 확인

state 파일에서 `worktree` 경로를 읽어 해당 디렉토리에서 작업합니다.

### 3-2. 구현

플랜의 Implementation Order에 따라 순차 구현:

1. **API 타입 + hooks** — TypeScript 타입, SWR/TanStack Query hooks
2. **공통 컴포넌트** — Props 타입, 스타일링, a11y
3. **페이지 컴포넌트** — 레이아웃, Server/Client 경계, 반응형
4. **에러/로딩 처리** — 에러 바운더리, Suspense, 빈 상태
5. **테스트** — RTL 컴포넌트 테스트, hook 테스트

> 독립적인 작업이면 Task tool로 병렬 실행 가능.
> 단, 파일 충돌이 없도록 scope를 명확히 분리.

### 3-3. 워크트리 내 검증

```bash
cd .worktrees/{slug}
pnpm lint
pnpm build
pnpm test
```

실패 시 수정 후 재실행.

### 3-4. 상태 업데이트 → Phase 4로 자동 연결

phase → `"done"`

**멈추지 않고 바로 Phase 4를 실행합니다.**

---

## Phase 4: PR

검증 후 PR을 생성합니다.

### 4-1. 워크트리에서 검증 루프

```bash
cd .worktrees/{slug}
```

```
LOOP (max 3):
  1. pnpm lint --fix
  2. pnpm build       → 실패 시 수정, 재시작
  3. pnpm test        → 실패 시 수정, 재시작
  4. All green → EXIT
```

3회 실패 시 사용자에게 보고 후 중단.

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
| **Convention** | 필수 | 항상 | 네이밍, 파일/폴더 구조, import 패턴, 프로젝트 규칙 (CLAUDE.md + rules/) |
| **Security** | 선택 | auth, api, middleware, 사용자 입력 처리 파일 변경 시 | XSS, 클라이언트 시크릿 노출, 인증/토큰 관리, 사용자 입력 검증, 의존성 취약점 |
| **Performance** | 선택 | 컴포넌트, 데이터 처리, 상태 관리 파일 변경 시 | 번들 크기, 무거운 연산, 메모리 릭, Core Web Vitals (훅 최적화는 React Pattern 담당) |
| **React Pattern** | 선택 | .tsx 컴포넌트, hooks, 상태 관리 파일 변경 시 | hooks 규칙, 리렌더 최적화, 컴포넌트 구조, 상태 패턴, a11y |

**Step 3: 선별된 에이전트를 하나의 응답에서 병렬 호출**

> **반드시 선별된 모든 Task를 한 번에 병렬 호출하세요. 순차 실행하지 마세요.**

각 에이전트의 Task tool 호출 형식:

```
Code Review (subagent_type: general-purpose) — 필수
prompt: "워크트리 {worktree_path}의 다음 변경 파일들을 리뷰해줘: {file_list}
전담 영역: 가독성, 중복 코드, 함수/파일 크기, 에러 처리.
제외 (다른 에이전트 담당): 네이밍 컨벤션, 보안, 성능 최적화, React 패턴.
심각도(Critical/High/Medium/Low)와 파일:라인 위치를 포함해서 리포트해줘."

Convention Review (subagent_type: general-purpose) — 필수
prompt: "워크트리 {worktree_path}의 다음 변경 파일들을 프로젝트 컨벤션 점검해줘: {file_list}
CLAUDE.md와 .claude/rules/ 에 정의된 프로젝트 규칙을 읽고 준수 여부를 확인해줘.
전담 영역: 네이밍, 파일/폴더 구조, import 패턴, 프로젝트 특화 규칙.
심각도(Critical/High/Medium/Low)와 파일:라인 위치를 포함해서 리포트해줘."

Security Review (subagent_type: general-purpose) — 선택
prompt: "워크트리 {worktree_path}의 다음 변경 파일들을 보안 점검해줘: {file_list}
전담 영역: XSS, 클라이언트 시크릿 노출, 인증/토큰 관리, 사용자 입력 검증, 의존성 취약점.
심각도(Critical/High/Medium/Low)와 파일:라인 위치를 포함해서 리포트해줘."

Performance Review (subagent_type: general-purpose) — 선택
prompt: "워크트리 {worktree_path}의 다음 변경 파일들을 성능 점검해줘: {file_list}
전담 영역: 번들 크기, 무거운 연산, 메모리 릭, Core Web Vitals.
제외 (React Pattern 담당): 리렌더 최적화, memo/useMemo/useCallback.
심각도(Critical/High/Medium/Low)와 파일:라인 위치를 포함해서 리포트해줘."

React Pattern Review (subagent_type: general-purpose) — 선택
prompt: "워크트리 {worktree_path}의 다음 변경 파일들을 React 패턴 점검해줘: {file_list}
전담 영역: hooks 규칙, 리렌더 최적화(memo/useMemo/useCallback), 컴포넌트 구조, 상태 관리 패턴, a11y.
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
## 개요
{이 PR이 왜 필요한지 1-2문장}

## 주요 변경사항

### 신규 파일
| 파일 | 역할 |
|------|------|
| `src/path/to/Component.tsx` | {역할 설명} |

### 수정 파일
| 파일 | 변경 내용 |
|------|----------|
| `src/path/to/existing.tsx` | {무엇을 왜 변경했는지} |

## 구현 상세

### {기능/컴포넌트 1}
- {구현 방식과 이유}
- {주요 로직 설명}

### {기능/컴포넌트 2}
- {구현 방식과 이유}

## 에이전트 리뷰 결과
- Code Review: {요약}
- Security: {요약}
- Performance: {요약}
- React Pattern: {요약}
- Convention: {요약}

## 스크린샷 / 동작
{해당 시 스크린샷 또는 동작 설명}

## 테스트
- [x] `pnpm lint` 통과
- [x] `pnpm build` 통과
- [x] `pnpm test` 통과
- [ ] {수동 확인 필요 항목}

## 참고사항
- {리뷰어가 알아야 할 컨텍스트, 트레이드오프, 후속 작업 등}
EOF
)"
```

### 4-5. Jira 상태 변경 (Jira 모드)

```typescript
mcp__jira__jira_transition_issue({ issue_key: "{JIRA-KEY}", transition: "In Review" })
```

### 4-6. 상태 업데이트

phase → `"pr"`, state에 `"pr_url"` 추가.

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
pnpm lint --fix && pnpm build && pnpm test
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
bash {CLAUDE_PLUGIN_ROOT}/scripts/orchestrate-clean.sh {project-root} {slug} {branch}
```

이 스크립트가 자동으로:
1. main checkout + pull
2. 워크트리 제거 (force + 디렉토리 정리)
3. 로컬 브랜치 삭제
4. 리모트 브랜치 삭제
5. `.orchestrate/{slug}.json` 삭제

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
/orchestrate 상품 검색 페이지. 필터링, 정렬, 무한스크롤.
```
→ Phase 1 (플랜) → 승인 후 Phase 2→3→4 자동 실행 → PR 생성 후 정지

```
/orchestrate
```
→ 세션 복구: 중단된 phase부터 이어서 자동 진행

```
/orchestrate PROJ-123
```
→ Jira 이슈 기반으로 Phase 1 시작
