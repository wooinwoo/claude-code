---
description: 사용 가능한 커맨드, 에이전트, 워크플로우 안내.
---

# Guide — 사용자 가이드

## Usage

```
/guide              → 전체 가이드
/guide commands     → 커맨드 목록
/guide orchestrate  → orchestrate 파이프라인 상세
/guide agents       → 에이전트 목록
```

---

## (기본) — 전체 가이드

아래 내용을 출력합니다.

```
## 커맨드

| 커맨드 | 용도 |
|--------|------|
| /orchestrate 기능 설명 | 전체 개발 파이프라인 (6-Phase, 워크트리 분리) |
| /commit              | 변경사항 분석 → conventional commit |
| /verify              | lint + build + test 한번에 |
| /jira                | 내 이슈 조회 / 생성 / 상태전환 / 검색 |
| /learn               | 패턴 추출 / 조회 / 진화 |
| /wt                  | Worktree 관리 (NestJS) |
| /guide               | 이 가이드 |

## 자주 쓰는 흐름

### 소규모 수정
  "이 버그 고쳐줘" → /verify → /commit

### 큰 기능 (파이프라인)
  /orchestrate 기능설명 → Plan → Branch → Develop → PR → Feedback → Clean

### 오늘 할 일 확인
  /jira → 내 이슈 목록 → /orchestrate PROJ-123

## 커맨드 없이도 됩니다

에이전트가 자연어로 자동 발동합니다:
  "빌드 에러 고쳐줘" → build-error-resolver
  "코드 리뷰해줘"   → code-reviewer
  "TDD로 해줘"     → tdd-guide
  "리팩토링해줘"    → refactor-cleaner
```

---

## commands — 커맨드 상세

`.claude/commands/` 디렉토리를 읽어 설치된 커맨드 목록과 각 description을 표시합니다.

```bash
ls .claude/commands/
```

각 파일의 frontmatter `description` 필드를 읽어 테이블로 정리:

```
| 커맨드 | 설명 |
|--------|------|
| /orchestrate | {description} |
| /commit      | {description} |
| ...          | ...           |
```

---

## orchestrate — 파이프라인 상세

orchestrate 파이프라인의 6-Phase를 안내합니다:

```
## Orchestrate 파이프라인

Phase 1: Plan     → 사용자와 플랜 협업 → 승인 필수
Phase 2: Branch   → 워크트리 + 브랜치 생성
Phase 3: Develop  → 워크트리에서 구현
Phase 4: PR       → 검증 (lint/build/test) → 커밋 → PR 생성
Phase 5: Feedback → PR 코멘트 반영 → push (반복)
Phase 6: Clean    → PR 병합 확인 → 워크트리/브랜치 삭제

### 사용법
  /orchestrate 검색 페이지    → 새 파이프라인 시작 (Phase 1)
  /orchestrate                → 현재 phase 감지 후 자동 진행
  /orchestrate PROJ-123       → Jira 이슈 기반 시작

### 여러 기능 동시 진행
  각 기능별 .orchestrate/{slug}.json 파일로 상태 관리
  /orchestrate → 현재 브랜치에 맞는 파이프라인 자동 감지
```

---

## agents — 에이전트 목록

`.claude/agents/` 디렉토리를 읽어 설치된 에이전트 목록과 트리거 조건을 표시합니다.

```bash
ls .claude/agents/
```

각 파일의 frontmatter를 읽어 테이블로 정리:

```
| 에이전트 | 트리거 | 설명 |
|---------|--------|------|
| planner | "계획 세워줘" | 구현 전 플랜 작성 |
| tdd-guide | "TDD로 해줘" | Red-Green-Refactor |
| ...     | ...    | ...  |
```
