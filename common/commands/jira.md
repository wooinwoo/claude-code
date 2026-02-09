---
description: Jira 이슈 관리. 내 할일 조회, 이슈 생성, 상세 보기, 상태 전환, 검색.
---

# Jira

## Usage

```
/jira                              → 나한테 할당된 이슈 목록
/jira bug 로그인 시 토큰 갱신 안 됨  → Bug 이슈 생성
/jira task 바우처 만료 알림 배치     → Task 이슈 생성
/jira PROJ-123                     → 이슈 상세 조회
/jira PROJ-123 진행중               → 상태 전환
/jira sprint                       → 현재 스프린트 이슈
/jira search 키워드                 → 이슈 검색
```

---

## (기본) — 내 이슈 목록

인자 없이 호출하면 나에게 할당된 열린 이슈를 보여줍니다.

```typescript
mcp__jira__jira_search({
  jql: "assignee = currentUser() AND status NOT IN (Done, Closed) ORDER BY priority DESC, updated DESC"
})
```

결과를 테이블로 정리:
```
| 키 | 유형 | 우선순위 | 상태 | 제목 |
```

---

## bug/task — 이슈 생성

### 1. 유형 판별

- 인자에 `bug` → Bug
- 인자에 `task` → Task
- 둘 다 아님 → AskUserQuestion

### 2. 정보 수집

AskUserQuestion으로:
- **프로젝트 키** (예: GIFCA, DEV)
- **제목** (인자에서 추출 가능하면 확인만)

### 3. 생성

**Bug:**
```typescript
mcp__jira__jira_create_issue({
  project_key: "{key}",
  summary: "{제목}",
  issue_type: "Bug",
  description: `
## 현상
{무엇이 잘못되었는가}

## 재현 방법
1. {단계}

## 기대 동작
{정상 동작}

## 원인 분석
{알고 있다면, 없으면 "분석 필요"}
`
})
```

**Task:**
```typescript
mcp__jira__jira_create_issue({
  project_key: "{key}",
  summary: "{제목}",
  issue_type: "Task",
  description: `
## 작업배경
{왜 필요한가}

## 작업내용
1. {구체적 작업}

## 완료조건
- [ ] {조건}
- [ ] 테스트 통과
- [ ] 코드 리뷰 완료
`
})
```

생성 후 이슈 키와 URL 반환.

---

## PROJ-123 — 이슈 상세 조회

이슈 키 패턴(`/^[A-Z]+-\d+$/`) 단독 입력 시.

```typescript
mcp__jira__jira_get_issue({ issue_key: "{KEY}" })
```

표시 항목: 제목, 상태, 담당자, 우선순위, 설명, 코멘트.

---

## PROJ-123 상태명 — 상태 전환

이슈 키 + 한글/영어 상태명.

| 입력 | 전환 |
|------|------|
| `진행중`, `in progress` | In Progress |
| `리뷰`, `in review` | In Review |
| `완료`, `done` | Done |
| `할일`, `todo` | To Do |

```typescript
mcp__jira__jira_transition_issue({
  issue_key: "{KEY}",
  transition: "{매핑된 상태}"
})
```

---

## sprint — 현재 스프린트

```typescript
mcp__jira__jira_search({
  jql: "sprint IN openSprints() AND project = {key} ORDER BY status ASC, priority DESC"
})
```

프로젝트 키를 모르면 AskUserQuestion.

결과를 상태별로 그룹핑:
```
📋 To Do (3)
  PROJ-101  검색 필터 추가
  ...
🔨 In Progress (2)
  PROJ-98   결제 연동
  ...
👀 In Review (1)
  PROJ-95   로그인 리팩토링
```

---

## search — 이슈 검색

```typescript
mcp__jira__jira_search({
  jql: "text ~ \"{키워드}\" AND project = {key} ORDER BY updated DESC"
})
```

프로젝트 키를 모르면 전체 프로젝트에서 검색.
