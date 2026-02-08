---
description: CI/CD 파이프라인 실패를 자율 진단하고 workflow YAML 수정으로 해결. SSH 접근 없이 config-as-code로만 수정.
---

# CI/CD Self-Healing

GitHub Actions 워크플로우 실패를 자율적으로 진단하고 수정합니다.

## Constraints

- Self-hosted runner: SSH 접근 불가
- 모든 수정은 workflow YAML / config 파일로만 가능
- pnpm workspace 모노레포 + Turborepo

## Process

### Step 1: Workflow 분석

`.github/workflows/*.yaml` 파일을 전부 읽고 각 job, runner, resource dependency를 매핑하세요.

### Step 2: 실패 모드 식별

각 워크플로우에서 발생 가능한 실패 모드를 식별하세요:
- Disk space 부족
- Cache invalidation / stale cache
- pnpm workspace dependency resolution 실패
- Timeout
- Flaky tests

### Step 3: 방어적 수정

각 실패 모드에 대해 방어적 수정을 작성하세요:
- Pre-job cleanup step
- Retry logic
- Conditional caching
- Resource limits

### Step 4: 검증 계획

각 수정에 대한 검증 방법을 명시하세요.

### Step 5: PR-ready 결과물

Summary table 형식으로 출력:

| Failure Mode | Fix Applied | Verification |
|-------------|------------|--------------|
| ... | ... | ... |

독립적인 워크플로우 파일은 병렬 Task agent로 처리하세요.

## Key Files

- `.github/workflows/ci.yaml`
- `.github/workflows/cd.yaml`
- `turbo.json`
- `apps/gifca/app/Dockerfile`
- `apps/gifca/batch/Dockerfile`
