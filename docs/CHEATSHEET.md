# Claude Code 치트시트

## 지금 뭐 하고 싶어?

### 코드 짜기

| 상황 | 입력 |
|------|------|
| 뭘 만들어야 하는데 어디서부터 해야 할지 모르겠음 | `/plan 만들고 싶은 거 설명` |
| 테스트부터 짜고 구현하고 싶음 | `/tdd 만들 기능 설명` |
| 큰 기능인데 알아서 다 해줬으면 | `/orchestrate feature 기능 설명` |
| **전문가 리뷰 포함 풀 워크플로우** | `/orchestrate-start` → `-review` → `-impl` → `-done` |

### 리뷰/검증

| 상황 | 입력 |
|------|------|
| 내가 짠 React 코드 리뷰해줘 | `/react-review` |
| 전체 코드 리뷰 (보안 포함) | `/code-review` |
| lint + build + test 한번에 돌려줘 | `/verify` |
| 테스트 커버리지 올려줘 | `/test-coverage` |

### 에러/버그

| 상황 | 입력 |
|------|------|
| 빌드가 깨졌음 | `/build-fix` |
| Next.js 빌드 에러 (hydration, RSC 등) | `/next-build` |
| 버그인데 원인을 모르겠음 | `/orchestrate bugfix 증상 설명` |

### 커밋/PR

| 상황 | 입력 |
|------|------|
| 커밋 메시지 만들어줘 | `/commit` |

### Jira (MCP 설정 필요)

| 상황 | 입력 |
|------|------|
| 버그 이슈 만들어줘 | `/jira-bug` |
| 작업 이슈 만들어줘 | `/jira-task` |

### 정리/리팩토링

| 상황 | 입력 |
|------|------|
| 안 쓰는 코드 정리해줘 | `/refactor-clean` |
| 안전하게 리팩토링해줘 | `/orchestrate refactor 설명` |
| 보안 점검해줘 | `/orchestrate security` |

### 테스트

| 상황 | 입력 |
|------|------|
| React 컴포넌트 테스트 만들어줘 | `/react-test` |
| E2E 테스트 만들어줘 | `/e2e 시나리오 설명` |

### 문서

| 상황 | 입력 |
|------|------|
| 코드맵 만들어줘 | `/update-codemaps` |
| 문서 갱신해줘 | `/update-docs` |

### 학습

| 상황 | 입력 |
|------|------|
| 이번 세션에서 배운 거 저장 | `/learn` |
| 저장된 패턴 보기 | `/instinct-status` |
| 패턴들을 스킬로 만들어줘 | `/evolve` |
| 커스텀 스킬 직접 만들기 | `/skill-create` |

---

## 자주 쓰는 흐름

### "기능 하나 만들어줘"
```
/plan 사용자 프로필 페이지
→ 계획 확인 → "ㅇㅇ"
→ 코딩 완료
/react-review
/verify
/commit
```

### "TDD로 만들어줘"
```
/tdd 장바구니 수량 변경
→ 테스트 → 구현 → 리팩토링 자동 반복
/verify
/commit
```

### "이거 왜 안 돼?"
```
/orchestrate bugfix 결제 후 리다이렉트 안 됨
→ 원인 추적 → 테스트 → 수정 → 리뷰 자동
/commit
```

### "빌드 터졌어"
```
/build-fix
```

### "큰 기능 통째로"
```
/orchestrate feature 실시간 알림 시스템
→ 계획 → TDD → 리뷰 → 보안검토 자동
/commit
```

### "전문가 리뷰 포함 풀 파이프라인"
```
/orchestrate-start
→ 요구사항 Q&A → 브랜치 → 플랜 작성

/orchestrate-review
→ React 전문가 + 퍼포먼스 + 보안 + 아키텍처 4명 병렬 리뷰

/orchestrate-impl
→ Data Layer + UI 병렬 구현 → 통합 & 테스트

/orchestrate-done
→ lint/build/test 검증 루프 → 3명 리뷰 → 커밋 → PR 자동 생성
```

---

## 설정 (최초 1회)

```powershell
# 1. 설치
cd C:\_project\template\wiw_claude-code
.\setup.ps1 react-next C:\path\to\my-project

# 2. 프로젝트 설명 작성
# my-project/CLAUDE.md 편집

# 3. (선택) Jira/GitHub MCP 쓸 거면
# .claude/.env 에 토큰 입력
# .claude/mcp-configs/mcp-servers.json → settings.local.json 복사

# 4. (선택) 프로젝트 전용 규칙
# .claude/rules/project.md 작성
```

## 업데이트

```powershell
cd C:\_project\template\wiw_claude-code
git pull
.\update.ps1 C:\path\to\my-project
```

## 프로젝트에 내 것 추가

| 추가할 것 | 파일 위치 | 예시 |
|-----------|----------|------|
| 프로젝트 규칙 | `.claude/rules/project.md` | "API 응답은 항상 camelCase" |
| 커스텀 커맨드 | `.claude/commands/my-cmd.md` | `/deploy`, `/migration` |
| 커스텀 에이전트 | `.claude/agents/my-agent.md` | 특수 리뷰어 |
| 커스텀 스킬 | `.claude/skills/my-skill/SKILL.md` | 도메인 지식 |
