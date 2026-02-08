---
description: Expert review of React plan. 4 parallel agents (React patterns, Performance, Security, Architecture) review and approve.
---

# Expert Plan Review (React)

4명의 전문가 에이전트가 병렬로 플랜을 리뷰합니다.

## Prerequisites

- [ ] `/orchestrate-start`로 플랜 작성 완료

## Procedure

### 1. 플랜 파일 읽기

```bash
ls plans/*.md
```

### 2. 4명의 전문가 병렬 리뷰

Task tool로 4개 에이전트 동시 실행:

**Agent 1 — React Patterns Expert** (`react-reviewer`):
```
Review the plan at plans/{plan-file}.md for React best practices:

1. Component 분리 적절성 (Single Responsibility)
2. Hooks 사용 패턴 (커스텀 훅 추출 시점, 의존성 관리)
3. Props drilling vs Context vs Store 선택
4. Server Component vs Client Component 경계
5. 접근성(a11y) 고려 여부
6. 재사용 가능한 컴포넌트 식별
7. 네이밍 컨벤션

Report: [CRITICAL/HIGH/MEDIUM/LOW] Finding → Recommendation
```

**Agent 2 — Performance Expert** (`performance-reviewer`):
```
Review the plan at plans/{plan-file}.md for performance concerns:

1. 렌더링 최적화 전략 (memo, useMemo, useCallback 필요성)
2. 코드 스플리팅 / dynamic import 기회
3. 이미지 최적화 (next/image, lazy loading)
4. 데이터 페칭 전략 (캐싱, 프리페칭, 워터폴 방지)
5. 번들 사이즈 영향 (의존성 선택)
6. Core Web Vitals 영향 (LCP, INP, CLS)
7. 가상화 필요 여부 (대규모 리스트)

Report: [CRITICAL/HIGH/MEDIUM/LOW] Finding → Recommendation
```

**Agent 3 — Security Expert** (`security-reviewer`):
```
Review the plan at plans/{plan-file}.md for security concerns:

1. XSS 방어 (dangerouslySetInnerHTML, URL 파라미터)
2. 인증/인가 체크 (라우트 보호, API 호출 시)
3. 민감 데이터 노출 (클라이언트 번들에 비밀 포함 여부)
4. CSRF 방어 전략
5. 입력 검증 (폼 데이터, 쿼리 파라미터)
6. 의존성 보안 (known vulnerabilities)
7. 환경변수 관리 (NEXT_PUBLIC_ prefix 주의)

Report: [CRITICAL/HIGH/MEDIUM/LOW] Finding → Recommendation
```

**Agent 4 — Architecture Expert** (`architect`):
```
Review the plan at plans/{plan-file}.md for architectural fitness:

1. 폴더 구조 일관성 (기존 프로젝트 패턴 준수)
2. 관심사 분리 (UI ↔ 로직 ↔ 데이터)
3. 상태 관리 전략 적절성
4. API 레이어 추상화 수준
5. 에러 바운더리 전략
6. 확장성 (기능 추가 시 변경 범위)
7. 기존 코드와의 일관성

Report: [CRITICAL/HIGH/MEDIUM/LOW] Finding → Recommendation
```

### 3. 리뷰 결과 종합

```markdown
## Expert Review Results

### React Patterns
{Agent 1 findings}

### Performance
{Agent 2 findings}

### Security
{Agent 3 findings}

### Architecture
{Agent 4 findings}

---
### Summary
- CRITICAL: {count}
- HIGH: {count}
- MEDIUM: {count}
- LOW: {count}
```

### 4. 수정 적용

CRITICAL/HIGH 이슈가 있으면:
1. 플랜 파일 수정
2. 변경사항 보고

### 5. 승인

```markdown
---
**Status**: Plan approved — proceed with `/orchestrate-impl`
**Reviews**: React OK | Performance OK | Security OK | Architecture OK
---
```

## Next Step

```
/orchestrate-impl
```
