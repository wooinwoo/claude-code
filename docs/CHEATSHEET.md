# Claude Code 치트시트

## 커맨드 (8개만)

| 커맨드 | 용도 |
|--------|------|
| `/orchestrate 기능 설명` | 전체 개발 파이프라인 (4-Phase, 반복 호출로 자동 진행) |
| `/commit` | 커밋 메시지 자동 생성 |
| `/verify` | lint + build + test 한번에 |
| `/jira bug/task 설명` | Jira 이슈 생성 |
| `/learn` | 패턴 추출/조회/진화 |
| `/wt new/list/sync/rm` | Worktree 관리 (NestJS) |

## 나머지는 자연어로

커맨드 없어도 에이전트가 알아서 뜹니다:

| 하고 싶은 거 | 그냥 이렇게 말하세요 |
|-------------|---------------------|
| 계획 세워줘 | "사용자 프로필 페이지 계획 세워줘" |
| TDD로 해줘 | "TDD로 장바구니 수량 변경 구현해줘" |
| 빌드 고쳐줘 | "빌드 에러 고쳐줘" |
| 코드 리뷰 | "코드 리뷰해줘" |
| React 리뷰 | "React 코드 리뷰해줘" |
| 테스트 커버리지 | "커버리지 80% 이상으로 올려줘" |
| 리팩토링 | "안 쓰는 코드 정리해줘" |
| E2E 테스트 | "E2E 테스트 만들어줘" |
| 문서 업데이트 | "README 업데이트해줘" |
| 보안 점검 | "보안 점검해줘" |
| CI 고쳐줘 | "CI 파이프라인 에러 고쳐줘" |
| Docker 최적화 | "Dockerfile 최적화해줘" |

---

## 자주 쓰는 흐름

### "기능 하나 만들어줘"
```
"사용자 프로필 페이지 만들어줘"
→ planner가 계획 → 확인 → 구현
→ "리뷰해줘"
/verify
/commit
```

### "큰 기능 통째로 (파이프라인)"
```
/orchestrate 상품 검색 페이지
→ Phase 1: 요구사항 Q&A → 브랜치 → 플랜

/orchestrate
→ Phase 2: 4명 전문가 병렬 리뷰

/orchestrate
→ Phase 3: 병렬 구현 → 통합 테스트

/orchestrate
→ Phase 4: 검증 → 리뷰 → 커밋 → PR
```

### "이거 왜 안 돼?"
```
"결제 후 리다이렉트 안 됨. 원인 찾아줘"
→ explorer가 코드 추적 → 원인 발견
"TDD로 수정해줘"
/verify
/commit
```

### "빌드 터졌어"
```
"빌드 에러 고쳐줘"
→ build-error-resolver가 자동 수정
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
```

## 업데이트

```powershell
cd C:\_project\template\wiw_claude-code
git pull
.\update.ps1 C:\path\to\my-project
```
