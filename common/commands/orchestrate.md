---
description: Multi-phase development pipeline with state tracking. Auto-detects current phase and continues.
---

# Orchestrate — Development Pipeline

단일 커맨드로 전체 개발 사이클을 관리합니다.

## State Tracking

`.orchestrate/state.json`으로 현재 단계를 추적합니다.
`/orchestrate`를 반복 호출하면 자동으로 다음 단계로 진행합니다.

### State File Format

```json
{
  "feature": "feature description",
  "jira_key": "PROJ-123 or null",
  "branch": "branch name",
  "plan_file": "plans/identifier.md",
  "phase": "review|impl|done|complete",
  "started_at": "ISO timestamp"
}
```

### Phase Detection

1. `.orchestrate/state.json` 파일을 확인
2. 파일 없음 → Phase 1 (Start)
3. `phase` 값에 따라 해당 Phase 실행
4. 인자가 있으면 항상 Phase 1부터 시작

## Pipeline Phases

```
Phase 1: Start    → 요구사항 확인 → 브랜치 → 플랜 작성
Phase 2: Review   → 전문가 에이전트 병렬 리뷰
Phase 3: Implement → 병렬 에이전트 구현
Phase 4: Done     → 검증 루프 → 리뷰 → 커밋 → PR
```

## Workflow Types

스택별 `/orchestrate` 커맨드가 구체적인 에이전트와 절차를 정의합니다.
이 base 커맨드는 스택 오버라이드가 없을 때 fallback으로 사용됩니다.

### Fallback Pipeline (no stack override)

**Phase 1 — Start:**
- Jira 확인/생성 (선택)
- 요구사항 Q&A
- 브랜치 생성
- `plans/{identifier}.md` 플랜 작성

**Phase 2 — Review:**
- `architect` 에이전트: 설계 리뷰
- `security-reviewer` 에이전트: 보안 리뷰
- `code-reviewer` 에이전트: 구현 품질 리뷰
- CRITICAL/HIGH 이슈 수정

**Phase 3 — Implement:**
- `planner` 에이전트 기반 구현
- `tdd-guide` 에이전트로 테스트 우선 개발
- 빌드 & 테스트 통과 확인

**Phase 4 — Done:**
- 검증 루프 (lint → build → test, max 3회)
- `code-reviewer` + `security-reviewer` 병렬 리뷰
- 커밋 → PR 생성 → Jira 상태 변경

## Examples

```
/orchestrate add user authentication
```
→ Phase 1 시작

```
/orchestrate
```
→ 현재 phase 감지하여 자동 진행

```
/orchestrate PROJ-123
```
→ Jira 이슈 기반으로 Phase 1 시작
