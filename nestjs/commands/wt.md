---
description: Git worktree 관리 (new/list/sync/rm). git gtr 기반.
---

# Worktree 관리

## Usage

```
/wt new feature/add-voucher-api      → worktree 생성 + .env 복사 + pnpm install
/wt new hotfix/bug --from main       → main에서 분기
/wt list                              → worktree 목록
/wt sync                              → 모든 worktree에 .env 동기화
/wt sync feature/my-feature           → 특정 worktree에 .env 동기화
/wt rm feature/old-feature            → worktree 삭제
/wt rm feature/done --delete-branch   → worktree + 브랜치 삭제
/wt                                   → 목록 출력
```

## 서브커맨드

### new

```bash
git gtr new <branch-name>                    # 기본 생성
git gtr new <branch-name> --from <ref>       # 특정 ref에서 분기
git gtr new <branch-name> --from-current     # 현재 브랜치에서 분기
git gtr new <branch-name> -e                 # 에디터 열기
```

자동 설정: `.env` 복사 + `pnpm install`
생성 후 **새 worktree 디렉토리로 cd**.

### list

```bash
git gtr list
```

### sync

```bash
git gtr copy <branch-name>     # 특정 worktree
git gtr copy -a                # 전체
git gtr copy <branch-name> -n  # dry-run
```

### rm

```bash
git gtr rm <branch-name>                    # worktree만 삭제
git gtr rm <branch-name> --delete-branch    # + 로컬 브랜치 삭제
git gtr rm <branch-name> --force            # 강제 삭제
```

인자 없으면 `git gtr list` 후 선택 요청.
