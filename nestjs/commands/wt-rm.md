---
description: Git worktree 삭제. 브랜치 동시 삭제 옵션 지원.
---

# Worktree 삭제

Git worktree를 삭제합니다.

## 실행 절차

### 1. 인자 확인

사용자가 브랜치명을 제공했는지 확인:
- 제공됨: 해당 worktree 삭제
- 미제공: `git gtr list` 실행 후 삭제할 worktree 선택 요청

### 2. Worktree 삭제

```bash
# 기본 삭제 (worktree만)
git gtr rm <branch-name>

# 브랜치도 함께 삭제
git gtr rm <branch-name> --delete-branch

# 강제 삭제 (커밋되지 않은 변경사항 무시)
git gtr rm <branch-name> --force
```

### 3. 결과 확인

```bash
git gtr list
```

## 주의사항

- `--delete-branch` 옵션은 로컬 브랜치만 삭제
- 원격 브랜치 삭제는 별도로 `git push origin --delete <branch>` 실행 필요
- dirty worktree 삭제 시 `--force` 필요

## 예시

```
/wt-rm feature/old-feature
```
→ worktree만 삭제

```
/wt-rm feature/completed --delete-branch
```
→ worktree + 로컬 브랜치 삭제

```
/wt-rm
```
→ 목록 출력 후 선택 요청
