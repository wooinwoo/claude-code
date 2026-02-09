---
description: 변경사항 분석 후 conventional commit 메시지 생성 및 커밋.
---

# Commit

## Usage

```
/commit                → 전체 변경사항 분석 후 커밋
/commit feat 로그인    → 타입/힌트 지정
```

## 절차

### 1. 변경사항 수집 (병렬 실행)

```bash
git diff --cached          # staged
git diff                   # unstaged
git status                 # 전체 상태
git log --oneline -10      # 최근 커밋 스타일 참고
```

### 2. 분석 및 판단

- 변경 없음 → 사용자에게 알리고 중단
- 변경이 여러 관심사에 걸침 → 분리 커밋 제안 (AskUserQuestion)
- 비밀 파일 포함 (.env, credentials, tokens) → 해당 파일 제외하고 경고

### 3. 스테이징

**개별 파일만 추가** — `git add -A`, `git add .` 절대 금지

```bash
git add src/auth/login.ts src/auth/login.test.ts
```

### 4. 커밋

```
<type>(<scope>): <description>
```

| type | 용도 |
|------|------|
| `feat` | 새 기능 |
| `fix` | 버그 수정 |
| `refactor` | 동작 변경 없는 구조 개선 |
| `test` | 테스트 추가/수정 |
| `chore` | 의존성, 설정 등 유지보수 |
| `docs` | 문서만 변경 |
| `perf` | 성능 개선 |
| `ci` | CI/CD 변경 |

**규칙:**
- 72자 이내, 소문자, 마침표 없음
- 명령형 ("add" not "added")
- scope = 영향받는 모듈/영역
- 영어로 작성

**예시:**
- `feat(auth): add JWT refresh token rotation`
- `fix(order): resolve race condition in payment callback`
- `refactor(user): extract email validation to value object`

## 금지사항

- `git add -A` / `git add .` 사용 금지
- 비밀 파일 커밋 금지
- `Co-Authored-By` 추가 금지
