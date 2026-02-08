---
description: Implement React feature with parallel agents. Data layer + UI components + Tests in parallel.
---

# Parallel Agent Implementation (React)

승인된 플랜을 병렬 에이전트로 구현합니다.

## Prerequisites

- [ ] `/orchestrate-review`로 플랜 승인 완료
- [ ] 전용 브랜치에서 작업 중

## Procedure

### 1. 플랜 읽기

```bash
git branch --show-current
```

`plans/{identifier}.md` 읽기

### 2. Phase 1: 데이터 레이어 + UI 기초 (병렬)

**Agent 1 — Data Layer:**
```
Implement Phase 1 from plans/{identifier}.md:

1. API 타입 정의
   - Request/Response 타입 (TypeScript)
   - API 엔드포인트 상수

2. API 훅 구현
   - SWR 또는 TanStack Query 사용
   - 에러 핸들링 포함
   - 옵티미스틱 업데이트 (필요시)

3. 상태 관리
   - Context 또는 Store 설정
   - 초기값, 액션 정의

기존 프로젝트의 패턴을 따르세요.
```

**Agent 2 — UI Components:**
```
Implement Phase 2 from plans/{identifier}.md:

1. 공통 컴포넌트
   - Props 타입 정의
   - 기본 스타일링
   - 접근성 속성 (aria-*, role)

2. 페이지 컴포넌트
   - 레이아웃 구조
   - 로딩/에러/빈 상태 UI
   - 반응형 처리

기존 프로젝트의 컴포넌트 패턴을 따르세요.
Server/Client Component 경계를 명확히 하세요.
```

### 3. Phase 2: 통합 + 테스트

**Agent 3 — Integration & Test:**
```
Implement Phase 3 from plans/{identifier}.md:

1. 페이지 조립
   - 컴포넌트 + 데이터 훅 연결
   - 라우팅 설정
   - 에러 바운더리 적용

2. 테스트 작성
   - 컴포넌트 단위 테스트 (React Testing Library)
   - 훅 테스트 (renderHook)
   - 인터랙션 테스트 (user events)
   - 최소 주요 플로우 커버

Note: Phase 1 완료 후 시작
```

### 4. 에이전트 실행

```typescript
// Phase 1: 병렬
Task(agent1_prompt, subagent_type: "general-purpose")  // Data
Task(agent2_prompt, subagent_type: "general-purpose")  // UI

// Phase 2: Phase 1 완료 후
Task(agent3_prompt, subagent_type: "general-purpose")  // Integration & Test
```

### 5. 통합 검증

모든 에이전트 완료 후:

```bash
pnpm lint
pnpm build
pnpm test
```

## Error Handling

- 빌드 실패: `/build-fix` 또는 `/next-build`
- 테스트 실패: 실패 원인 분석 후 해당 에이전트 재실행

## Done Criteria

- [ ] 모든 에이전트 완료
- [ ] 빌드 통과
- [ ] 테스트 통과

## Next Step

```
/orchestrate-done
```
