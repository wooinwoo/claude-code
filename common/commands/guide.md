---
description: 상황별 커맨드/프롬프트 추천. "뭐 써야해?" 싶으면 이거.
---

# Guide — 상황별 추천

## Usage

```
/guide              → 상황별 추천 (이거)
/guide commands     → 설치된 커맨드 목록
/guide agents       → 설치된 에이전트 목록
/guide orchestrate  → 파이프라인 상세
```

---

## (기본) — 상황별 추천

사용자가 `/guide`만 호출하면, 아래 상황 매트릭스를 보여주고 **"지금 뭘 하고 싶으세요?"** 라고 AskUserQuestion으로 물어봅니다.

선택지:
1. 새 기능 개발
2. 버그 수정 / 소규모 수정
3. 코드 리뷰 / 품질 개선
4. Jira / 프로젝트 관리

### 1. 새 기능 개발

| 상황 | 추천 | 프롬프트 예시 |
|------|------|--------------|
| 기능이 크다 (여러 파일, API+UI) | `/orchestrate` | `/orchestrate 상품 검색 페이지. 필터, 정렬, 무한스크롤` |
| Jira 이슈가 이미 있다 | `/orchestrate` | `/orchestrate PROJ-123` |
| 간단한 기능 추가 | 자연어 | `회원 탈퇴 확인 모달 추가해줘. 확인 누르면 /api/users/me DELETE 호출` |
| 설계부터 하고 싶다 | 자연어 (planner 자동 발동) | `결제 시스템 설계해줘. PG사 연동, 취소/환불 포함` |
| TDD로 하고 싶다 | 자연어 (tdd-guide 자동) | `TDD로 쿠폰 적용 로직 만들어줘. 중복 사용 불가, 만료 체크` |

### 2. 버그 수정 / 소규모 수정

| 상황 | 추천 | 프롬프트 예시 |
|------|------|--------------|
| 에러 메시지가 있다 | 자연어 | `이 에러 고쳐줘: TypeError: Cannot read property 'map' of undefined` |
| 빌드 실패 | 자연어 (build-error-resolver 자동) | `빌드 에러 고쳐줘` |
| 수정 후 검증 | `/verify` | `/verify` |
| 수정 후 커밋 | `/commit` | `/commit` |
| 소규모 수정 전체 흐름 | 조합 | 에러 설명 → 수정 → `/verify` → `/commit` |

### 3. 코드 리뷰 / 품질 개선

| 상황 | 추천 | 프롬프트 예시 |
|------|------|--------------|
| 코드 리뷰 | 자연어 (code-reviewer 자동) | `이 PR 코드 리뷰해줘` 또는 `src/payment/ 리뷰해줘` |
| 보안 점검 | 자연어 (security-reviewer 자동) | `보안 리뷰해줘. 인증/인가 중심으로` |
| DB 쿼리 점검 | 자연어 (database-reviewer 자동) | `이 쿼리 리뷰해줘. N+1 문제 있는지` |
| 리팩토링 | 자연어 (refactor-cleaner 자동) | `이 파일 리팩토링해줘. 중복 제거, 책임 분리` |
| 성능 개선 (React) | 자연어 (performance-reviewer 자동) | `이 페이지 렌더링 최적화해줘` |
| 프로젝트 파악 | 자연어 (explorer 자동) | `이 프로젝트 구조 분석해줘` |

### 4. Jira / 프로젝트 관리

| 상황 | 추천 | 프롬프트 예시 |
|------|------|--------------|
| 내 이슈 보기 | `/jira` | `/jira` |
| 이슈 검색 | `/jira` | `/jira search 결제 버그` |
| 이슈 만들기 | `/jira` | `/jira create 로그인 실패 시 에러 메시지 미노출` |
| 이슈 → 개발 시작 | `/orchestrate` | `/jira` → 이슈 확인 → `/orchestrate PROJ-123` |

### 5. 진행 중인 작업 이어하기

| 상황 | 추천 | 프롬프트 예시 |
|------|------|--------------|
| 파이프라인 이어가기 | `/orchestrate` | `/orchestrate` (현재 phase 자동 감지) |
| PR 리뷰 반영 | `/orchestrate` | `/orchestrate` (Feedback phase에서 자동 감지) |
| 뭘 하고 있었는지 모르겠다 | `/guide` | `/guide` → 상황 선택 |

---

## commands — 설치된 커맨드 목록

`.claude/commands/` 디렉토리를 읽어 설치된 커맨드와 description을 테이블로 표시합니다.

```bash
ls .claude/commands/
```

각 파일의 frontmatter `description`을 읽어:

```
| 커맨드 | 설명 |
|--------|------|
| /orchestrate | {description} |
| /commit      | {description} |
| ...          | ...           |
```

---

## agents — 설치된 에이전트 목록

`.claude/agents/` 디렉토리를 읽어 에이전트 목록을 표시합니다.

```bash
ls .claude/agents/
```

각 파일의 frontmatter를 읽어:

```
| 에이전트 | 트리거 | 설명 |
|---------|--------|------|
| planner | "설계해줘", "계획 세워줘" | 구현 전 플랜 작성 |
| tdd-guide | "TDD로 해줘" | Red-Green-Refactor |
| code-reviewer | "코드 리뷰해줘" | 코드 품질 리뷰 |
| build-error-resolver | "빌드 에러 고쳐줘" | 빌드 에러 자동 해결 |
| security-reviewer | "보안 리뷰해줘" | 보안 취약점 점검 |
| database-reviewer | "쿼리 리뷰해줘" | DB 쿼리 최적화 |
| refactor-cleaner | "리팩토링해줘" | 코드 정리, 중복 제거 |
| e2e-runner | "E2E 테스트 돌려줘" | E2E 테스트 실행 |
| explorer | "프로젝트 분석해줘" | 코드베이스 탐색 |
| doc-updater | "문서 업데이트해줘" | 문서 자동 갱신 |
| architect | "아키텍처 설계해줘" | 시스템 설계 |
```

---

## orchestrate — 파이프라인 상세

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
