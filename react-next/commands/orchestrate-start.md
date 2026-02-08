---
description: Start React feature workflow. Jira check → requirements Q&A → branch → plan writing.
---

# Start React Feature Workflow

새 기능 개발 사이클을 시작합니다.

## Procedure

### 1. Jira 확인

```
기존 Jira 이슈가 있나요?
- Yes: 이슈 키 입력 (예: PROJ-123)
- No: 새로 생성
- Standalone: Jira 없이 진행
```

**이슈 있으면:** `mcp__jira__jira_get_issue`로 조회 → 이슈 생성 스킵

### 2. 요구사항 Q&A

사용자와 인터뷰하여 다음을 명확히:

- **목적과 사용자 가치** - 왜 이 기능이 필요한가?
- **UI/UX 명세** - 어떤 화면? 어떤 인터랙션?
- **데이터 흐름** - API 엔드포인트, 요청/응답 형태
- **상태 관리** - 전역/로컬 상태, 캐싱 전략
- **에러 처리** - 로딩, 에러, 빈 상태 UI
- **반응형** - 모바일/태블릿/데스크톱

### 3. Jira 이슈 생성 (필요시)

> 이미 이슈가 있거나 standalone이면 스킵

### 4. 브랜치 생성

```bash
# Jira 모드
git checkout -b {JIRA-KEY}-{feature-slug}

# Standalone 모드
git checkout -b feature/{feature-slug}
```

### 5. 플랜 작성

`plans/{identifier}.md` 생성:

```markdown
# Implementation Plan: {feature name}

## Tracking
- Issue: {JIRA-KEY 또는 branch name}

## Requirements Summary
{Q&A 결과 정리}

## Component Architecture

### Pages / Routes
- [ ] {PageName} - {설명}

### Components
- [ ] {ComponentName} - {역할}
- [ ] {ComponentName} - {역할}

### Hooks / State
- [ ] {useHookName} - {목적}
- [ ] {Context 또는 Store} - {관리할 상태}

### API Integration
- [ ] {endpoint} - {method} {request/response}

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

---
**Status**: Plan ready — proceed with `/orchestrate-review`
```

## Done Criteria

- [ ] 요구사항 명확화
- [ ] 브랜치 생성
- [ ] 플랜 문서 작성

## Next Step

```
/orchestrate-review
```
