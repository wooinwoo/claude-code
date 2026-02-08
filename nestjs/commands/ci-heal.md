---
description: CI/CD 파이프라인 실패를 자율 진단하고 workflow YAML 수정으로 해결.
---

# CI/CD Self-Healing

GitHub Actions 워크플로우 실패를 자율적으로 진단하고 수정합니다.

## Constraints

- 모든 수정은 workflow YAML / config 파일로만 가능
- SSH 접근이 불가한 runner 환경 가정

## Process

### Step 1: Workflow 분석

`.github/workflows/*.yaml` 파일을 전부 읽고 각 job, runner, resource dependency를 매핑하세요.

### Step 2: 실패 모드 식별

- Disk space 부족
- Cache invalidation / stale cache
- 패키지 매니저 dependency resolution 실패
- Timeout
- Flaky tests

### Step 3: 방어적 수정

각 실패 모드에 대해:
- Pre-job cleanup step
- Retry logic
- Conditional caching
- Resource limits

### Step 4: PR-ready 결과물

| Failure Mode | Fix Applied | Verification |
|-------------|------------|--------------|
| ... | ... | ... |

독립적인 워크플로우 파일은 병렬 Task agent로 처리하세요.
