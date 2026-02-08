---
description: Finalize React feature. Verification loop → expert review → commit → PR.
---

# Finalize and Create PR (React)

검증, 리뷰, PR 생성을 수행합니다.

## Prerequisites

- [ ] `/orchestrate-impl`로 구현 완료
- [ ] 전용 브랜치에서 작업 중

## Procedure

### 1. 검증 루프

모든 체크가 통과할 때까지 반복. **루프를 빠져나오기 전에 Step 2로 가지 마세요.**

```
LOOP:
  1. Lint & Format
     $ pnpm lint --fix

  2. Build
     $ pnpm build
     → 실패 시: /next-build로 수정, LOOP 재시작

  3. Test
     $ pnpm test
     → 실패 시: 원인 분석 후 수정, LOOP 재시작

  4. All green → EXIT LOOP
```

**규칙:**
- 최대 3회 반복. 3회 후에도 실패하면 사용자에게 보고.
- 매 반복은 Step 1(lint)부터 시작 (수정으로 인한 리그레션 방지).

### 2. 전문가 리뷰 (병렬)

3개 에이전트 동시 실행:

**react-reviewer:**
```
Review changed files for React best practices:
- Hooks 규칙 준수
- Component 패턴 일관성
- Props 타입 완전성
- 접근성(a11y)
```

**performance-reviewer:**
```
Review changed files for performance:
- 불필요한 re-render
- 번들 사이즈 영향
- 이미지/폰트 최적화
- 데이터 페칭 효율성
```

**security-reviewer:**
```
Review changed files for security:
- XSS 방어
- 인증/인가 체크
- 민감 데이터 노출
- 입력 검증
```

CRITICAL/HIGH 이슈 발견 시 수정 후 **검증 루프(Step 1) 재실행**.

### 3. Commit

```bash
git status
git add {specific files}

git commit -m "$(cat <<'EOF'
feat({scope}): {description}

- {change 1}
- {change 2}

JIRA: {JIRA-KEY}
EOF
)"
```

### 4. PR 생성

```bash
git push -u origin {branch}

gh pr create --title "{type}({scope}): {description} {JIRA-KEY}" --body "$(cat <<'EOF'
## Summary
{what was built and why}

## Changes
- {change 1}
- {change 2}

## Screenshots
{if UI changes}

## Test
- [x] Unit tests added
- [x] Build passes
- [x] Lint passes

## Review Notes
- React Patterns: OK
- Performance: OK
- Security: OK
EOF
)"
```

**Standalone 모드:** JIRA-KEY 생략

### 5. Jira 상태 변경 (Jira 모드)

```typescript
mcp__jira__jira_transition_issue({
  issue_key: "{JIRA-KEY}",
  transition: "In Review"
})
```

## Done Criteria

- [ ] 검증 루프 통과 (build + test green)
- [ ] React 리뷰 완료
- [ ] Performance 리뷰 완료
- [ ] Security 리뷰 완료
- [ ] PR 생성
- [ ] PR URL 반환

## Output Format

```markdown
## Development Complete

### Verification
- Lint: pass
- Build: pass
- Test: 8/8 pass

### Expert Reviews
- React Patterns: no issues
- Performance: no issues
- Security: no issues

### Pull Request
- **URL**: {PR URL}
- **Title**: feat(profile): add user profile page PROJ-123
- **Branch**: PROJ-123-user-profile → main
```

## Examples

```
/orchestrate-done
```
→ 검증 → 리뷰 → PR

```
/orchestrate-done --skip-review
```
→ 리뷰 스킵 (핫픽스)
