---
description: Jira 이슈 생성 (bug 또는 task). 유형에 맞는 템플릿으로 자동 구성.
---

# Jira 이슈 생성

## Usage

```
/jira bug 로그인 시 토큰 갱신 안 됨
/jira task 바우처 만료 알림 배치 구현
/jira                              → 유형 선택 요청
```

## 절차

### 1. 유형 판별

- 인자에 `bug` → Bug 이슈
- 인자에 `task` → Task 이슈
- 인자 없음 → AskUserQuestion으로 확인

### 2. 정보 수집

AskUserQuestion으로 필수 정보 확인:
- **프로젝트 키** (예: GIFCA, DEV)
- **제목**

### 3. 이슈 생성

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

### 4. 결과 반환

생성된 이슈 키와 URL 반환.
