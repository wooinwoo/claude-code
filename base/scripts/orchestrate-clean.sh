#!/usr/bin/env bash
# orchestrate Phase 6: Clean
# Usage: orchestrate-clean.sh <project-root> <slug> <branch>

set -e

PROJECT_ROOT="$1"
SLUG="$2"
BRANCH="$3"

if [ -z "$PROJECT_ROOT" ] || [ -z "$SLUG" ] || [ -z "$BRANCH" ]; then
  echo "Usage: orchestrate-clean.sh <project-root> <slug> <branch>"
  exit 1
fi

cd "$PROJECT_ROOT"

echo "=== Phase 6: Clean ==="

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
