---
description: Git worktree에 .env 파일 동기화.
---

# Worktree .env 동기화

메인 저장소의 .env 파일을 worktree에 동기화합니다.

## 실행 절차

### 1. 동기화 대상 확인

```bash
# 현재 설정된 복사 대상 확인
git gtr config list | grep copy.include
```

### 2. 동기화 실행

```bash
# 특정 worktree에 동기화
git gtr copy <branch-name>

# 모든 worktree에 동기화
git gtr copy -a

# 미리보기 (dry-run)
git gtr copy <branch-name> -n
```

## 현재 동기화 대상

- `apps/gifca/app/.env`
- `apps/gifca/app/.env.test`
- `apps/gifca/db/.env`

## 예시

```
/wt-sync feature/my-feature
```
→ 특정 worktree에 .env 복사

```
/wt-sync --all
```
→ 모든 worktree에 .env 복사

```
/wt-sync
```
→ 모든 worktree에 .env 복사 (기본 동작)
