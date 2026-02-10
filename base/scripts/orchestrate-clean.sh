#!/usr/bin/env bash
# orchestrate Phase 6: Clean
# Usage: orchestrate-clean.sh <project-root> <slug> <branch> [--force-delete]

set -e

PROJECT_ROOT="$1"
SLUG="$2"
BRANCH="$3"
FORCE_DELETE="$4"

if [ -z "$PROJECT_ROOT" ] || [ -z "$SLUG" ] || [ -z "$BRANCH" ]; then
  echo "Usage: orchestrate-clean.sh <project-root> <slug> <branch> [--force-delete]"
  exit 1
fi

cd "$PROJECT_ROOT"

echo "=== Phase 6: Clean ==="

# 0. PR merge 확인 (--force-delete가 아닐 때만)
if [ "$FORCE_DELETE" != "--force-delete" ]; then
  echo "[0/5] PR 상태 확인"
  PR_MERGED=$(gh pr view "$BRANCH" --json merged -q '.merged' 2>/dev/null || echo "unknown")

  if [ "$PR_MERGED" = "false" ]; then
    echo ""
    echo "❌ PR이 아직 merge되지 않았습니다."
    echo ""
    echo "PR 상태: Open (Not Merged)"
    echo "브랜치: $BRANCH"
    echo ""
    echo "⚠️  Clean을 실행하면 작업 내용이 영구적으로 삭제됩니다."
    echo ""
    echo "다음 중 하나를 선택하세요:"
    echo "  1. PR을 먼저 merge하세요 (GitHub에서)"
    echo "  2. Clean을 건너뛰고 수동으로 정리하세요"
    echo "  3. PR을 포기하고 작업 내용을 삭제하려면 아래 명령어를 실행하세요:"
    echo ""
    echo "     bash .claude/scripts/orchestrate-clean.sh $(pwd) $SLUG $BRANCH --force-delete"
    echo ""
    exit 1
  elif [ "$PR_MERGED" = "true" ]; then
    echo "  ✅ PR이 merge되었습니다. 안전하게 정리합니다."
  else
    echo "  ⚠️  PR 상태를 확인할 수 없습니다 (PR이 없거나 gh CLI 오류)"
    echo "  계속 진행합니다. (주의: 작업 내용이 삭제될 수 있습니다)"
  fi
else
  echo "[0/5] PR 확인 건너뜀 (--force-delete)"
  echo "  ⚠️  강제 삭제 모드: 작업 내용이 영구적으로 삭제됩니다."
fi

# 1. main 업데이트
echo "[1/5] main 브랜치 업데이트"
git checkout main 2>&1
git pull origin main 2>&1

# 2. 워크트리 제거
WORKTREE_PATH=".worktrees/$SLUG"
if git worktree list | grep -q "$SLUG"; then
  echo "[2/5] 워크트리 제거 (git)"
  git worktree remove "$WORKTREE_PATH" --force 2>&1 || true
fi
if [ -d "$WORKTREE_PATH" ]; then
  echo "[2/5] 워크트리 디렉토리 정리"
  rm -rf "$WORKTREE_PATH"
fi
# .worktrees 비었으면 삭제
if [ -d ".worktrees" ] && [ -z "$(ls -A .worktrees 2>/dev/null)" ]; then
  rmdir .worktrees
fi
echo "[2/5] 워크트리 정리 완료"

# 3. 브랜치 삭제 (local)
echo "[3/5] 로컬 브랜치 삭제"
git branch -D "$BRANCH" 2>&1 || echo "  (이미 삭제됨)"

# 4. 브랜치 삭제 (remote)
echo "[4/5] 리모트 브랜치 삭제"
git push origin --delete "$BRANCH" 2>&1 || echo "  (이미 삭제됨)"

# 5. state 파일 정리
echo "[5/5] state 파일 정리"
STATE_FILE=".orchestrate/$SLUG.json"
if [ -f "$STATE_FILE" ]; then
  rm "$STATE_FILE"
fi
if [ -d ".orchestrate" ] && [ -z "$(ls -A .orchestrate 2>/dev/null)" ]; then
  rmdir .orchestrate
fi

echo ""
echo "=== 정리 완료 ==="
echo "  워크트리: $WORKTREE_PATH 삭제됨"
echo "  브랜치: $BRANCH 삭제됨 (local + remote)"
echo "  main: 최신 상태"
