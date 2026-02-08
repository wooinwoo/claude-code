---
description: Docker 빌드 최적화. workspace 의존성이 Docker와 CI 양쪽에서 동작하는 최적 전략 탐색.
---

# Docker Build Optimization

패키지 매니저 workspace 의존성이 Docker 빌드와 CI 양쪽에서 안정적으로 동작하는 최적 빌드 전략을 탐색합니다.

## Process

### Step 1: 의존성 매핑

다음 파일들을 읽고 의존성 구조를 매핑하세요:
- 워크스페이스 설정 파일 (pnpm-workspace.yaml, package.json workspaces 등)
- 모든 `package.json` (root, apps/*, packages/*)
- 모든 Dockerfile, `.dockerignore`
- 빌드 오케스트레이션 설정 (turbo.json, nx.json 등)

### Step 2: 전략 생성

| 전략 | 설명 |
|------|------|
| A | Multi-stage build + full workspace copy + `pnpm deploy` |
| B | `pnpm fetch` + selective package copy |
| C | `turbo prune --docker` 기반 빌드 |
| D | Pre-bundle workspace deps before Docker context |

### Step 3: 각 전략 테스트

1. 완성된 Dockerfile + 보조 스크립트 작성
2. `docker build --no-cache .` 실행
3. resolution 에러 발생 시 수정 후 재시도 (최대 5회)
4. 빌드 시간과 이미지 크기 기록

### Step 4: CI 호환성 검증

성공한 전략에 대해 CI 호환성 확인.

### Step 5: 최종 추천

단일 추천 Dockerfile + 전략별 비교 테이블 출력.
