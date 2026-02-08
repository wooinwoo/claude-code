---
description: 새 Git worktree 생성. .env 복사 및 pnpm install 자동 실행.
---

# 새 Worktree 생성

Git worktree를 생성하고 환경을 자동 설정합니다.

## 실행 절차

### 1. 인자 확인

사용자가 브랜치명을 제공했는지 확인:
- 제공됨: 해당 브랜치명 사용
- 미제공: 사용자에게 브랜치명 요청

### 2. Worktree 생성

```bash
# 기본 생성 (자동으로 .env 복사 + pnpm install 실행됨)
git gtr new <branch-name>
```

### 3. 옵션 처리

사용자 요청에 따라 옵션 추가:

```bash
# 에디터 열기 요청 시
git gtr new <branch-name> -e

# 특정 브랜치/커밋에서 생성 요청 시
git gtr new <branch-name> --from <ref>

# 현재 브랜치에서 변형 생성 요청 시
git gtr new <branch-name> --from-current
```

### 4. 결과 확인

```bash
git gtr list
```

## 자동 설정 항목

gtr 설정에 의해 자동 실행:
- `apps/gifca/app/.env` 복사
- `apps/gifca/app/.env.test` 복사
- `apps/gifca/db/.env` 복사
- `pnpm install` 실행

## 예시

```
/wt-new feature/add-voucher-api
```
→ `feature/add-voucher-api` worktree 생성

```
/wt-new hotfix/payment-bug --from main
```
→ main 브랜치에서 핫픽스 worktree 생성

```
/wt-new
```
→ 브랜치명 입력 요청
