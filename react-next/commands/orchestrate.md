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
Phase 2: Branch   → 워크트리 + 브랜치 생성
Phase 3: Develop  → 워크트리에서 구현
Phase 4: PR       → 검증 → 커밋 → PR 생성
Phase 5: Feedback → PR 코멘트 반영 (반복)
Phase 6: Clean    → PR 병합 확인 → 워크트리/브랜치 삭제
```

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

### 1-5. 사용자 승인

**플랜을 보여주고 반드시 승인을 받습니다.**
수정 요청 시 반영 후 재승인.

### 1-6. 상태 저장

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
Phase 1 완료. 플랜이 승인되었습니다.
→ /orchestrate 를 호출하면 Phase 2 (워크트리 생성)로 진행합니다.
```

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

### 2-4. 상태 업데이트

phase → `"develop"`

```
Phase 2 완료. 워크트리가 생성되었습니다.
→ 작업 디렉토리: .worktrees/{slug}/
→ /orchestrate 를 호출하면 Phase 3 (구현)으로 진행합니다.
```

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

### 3-4. 상태 업데이트

phase → `"done"`

```
Phase 3 완료. 구현이 완료되었습니다.
- Build: {pass/fail}
- Test: {N/N pass}
→ /orchestrate 를 호출하면 Phase 4 (검증 + PR)로 진행합니다.
```

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

### 4-2. 커밋

```bash
git add {specific files}
git commit -m "{type}({scope}): {description}"
```

### 4-3. PR 생성

```bash
git push -u origin {branch}

gh pr create --title "{type}({scope}): {description}" --body "$(cat <<'EOF'
## Summary
{what and why}

## Changes
- {change 1}
- {change 2}

## Test
- [x] Build passes
- [x] Tests pass
EOF
)"
```

### 4-4. Jira 상태 변경 (Jira 모드)

```typescript
mcp__jira__jira_transition_issue({ issue_key: "{JIRA-KEY}", transition: "In Review" })
```

### 4-5. 상태 업데이트

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

### 6-1. main 브랜치 업데이트

```bash
cd {project-root}
git checkout main
git pull origin main
```

### 6-2. 워크트리 삭제

```bash
git worktree remove .worktrees/{slug}
```

### 6-3. 브랜치 삭제

```bash
# 로컬
git branch -d {branch}

# 리모트 (이미 삭제됐으면 스킵)
git push origin --delete {branch} 2>/dev/null || true
```

### 6-4. state 파일 정리

```bash
rm .orchestrate/{slug}.json
```

### 6-5. Jira 상태 변경 (Jira 모드)

```typescript
mcp__jira__jira_transition_issue({ issue_key: "{JIRA-KEY}", transition: "Done" })
```

### 6-6. 완료

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
→ Phase 1: 사용자와 플랜 협업

```
/orchestrate
```
→ 현재 phase 감지하여 자동 진행

```
/orchestrate PROJ-123
```
→ Jira 이슈 기반으로 Phase 1 시작
