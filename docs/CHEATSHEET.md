# Claude Code 치트시트

## 커맨드

| 커맨드 | 용도 |
|--------|------|
| `/orchestrate 기능 설명` | 전체 개발 파이프라인 (6-Phase, 워크트리 분리) |
| `/commit` | 변경사항 분석 → conventional commit |
| `/verify` | lint + build + test 한번에 |
| `/jira bug/task 설명` | Jira 이슈 생성/조회/전환 |
| `/learn` | 패턴 추출/조회/진화 |
| `/wt new/list/sync/rm` | Worktree 관리 (NestJS) |
| `/guide` | 커맨드/에이전트/워크플로우 안내 |

## 나머지는 자연어로

커맨드 없어도 에이전트가 알아서 뜹니다:

| 하고 싶은 거 | 그냥 이렇게 말하세요 |
|-------------|---------------------|
| 계획 세워줘 | "사용자 프로필 페이지 계획 세워줘" |
| TDD로 해줘 | "TDD로 장바구니 수량 변경 구현해줘" |
| 빌드 고쳐줘 | "빌드 에러 고쳐줘" |
| 코드 리뷰 | "코드 리뷰해줘" |
| 리팩토링 | "안 쓰는 코드 정리해줘" |
| E2E 테스트 | "E2E 테스트 만들어줘" |
| 문서 업데이트 | "README 업데이트해줘" |

---

## 자주 쓰는 흐름

### 소규모 수정 (파이프라인 없이)
```
"이 버그 고쳐줘"
→ 수정
/verify
/commit
```

### 큰 기능 (파이프라인)
```
/orchestrate 상품 검색 페이지
→ Phase 1: Plan — 요구사항 Q&A → 플랜 작성 → 승인

/orchestrate
→ Phase 2: Branch — 워크트리 + 브랜치 생성

/orchestrate
→ Phase 3: Develop — 워크트리에서 구현

/orchestrate
→ Phase 4: PR — 검증 → 커밋 → PR 생성

(리뷰 코멘트 달리면)
/orchestrate
→ Phase 5: Feedback — 코멘트 반영 → push (반복)

(PR 병합되면)
/orchestrate
→ Phase 6: Clean — 워크트리/브랜치 삭제
```

### 여러 기능 동시에
```
/orchestrate 검색 페이지       → .orchestrate/search-page.json
/orchestrate 결제 기능          → .orchestrate/payment.json
/orchestrate                    → 현재 브랜치에 맞는 파이프라인 자동 감지
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
