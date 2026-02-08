---
description: pnpm workspace + Docker 빌드 최적화. workspace/inject 프로토콜이 Docker와 GitHub Actions 양쪽에서 동작하는 최적 전략 탐색.
---

# Docker Build Optimization

pnpm workspace 의존성이 Docker 빌드와 GitHub Actions CI 양쪽에서 안정적으로 동작하는 최적 빌드 전략을 탐색합니다.

## Constraints

- Self-hosted runner: SSH 접근 불가
- pnpm 10 + workspace protocol
- Turborepo build orchestration
- Node.js 20 Alpine base image

## Process

### Step 1: 의존성 매핑

다음 파일들을 읽고 의존성 구조를 매핑하세요:
- `pnpm-workspace.yaml`
- 모든 `package.json` (root, apps/*, packages/*)
- 모든 Dockerfile, `.dockerignore`
- `turbo.json`

`workspace:` vs `catalog:` 프로토콜 사용 현황을 정리하세요.

### Step 2: 4개 전략 생성

| 전략 | 설명 |
|------|------|
| A | Multi-stage build + full workspace copy + `pnpm deploy` |
| B | `pnpm fetch` + selective package copy |
| C | `turbo prune --docker` 기반 빌드 |
| D | Pre-bundle workspace deps before Docker context |

### Step 3: 각 전략 테스트

각 전략에 대해:
1. 완성된 Dockerfile + 보조 스크립트 작성
2. `docker build --no-cache .` 실행
3. resolution 에러 발생 시 수정 후 재시도 (최대 5회)
4. 빌드 시간과 이미지 크기 기록

### Step 4: CI 호환성 검증

성공한 전략에 대해 GitHub Actions 호환성 확인:
- Runner OS
- Caching config (`.github/workflows/ci.yaml`)
- Build args, env vars

### Step 5: 최종 추천

단일 추천 Dockerfile 출력:
- 각 결정에 대한 inline 주석
- 전략별 비교 테이블 (빌드 시간, 이미지 크기)
- CI workflow 변경사항 (필요한 경우)

## Key Files

- `apps/gifca/app/Dockerfile`
- `apps/gifca/batch/Dockerfile`
- `pnpm-workspace.yaml`
- `.github/workflows/ci.yaml`
- `.github/workflows/cd.yaml`
- `turbo.json`
