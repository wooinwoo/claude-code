# React/Next.js 프로젝트 가이드

## 전체 구조 마인드맵

```mermaid
mindmap
  root((React/Next.js<br/>Claude Code))
    **일상 개발**
      /plan
        planner 에이전트
        "계획 → 확인 → 실행"
      /tdd
        tdd-guide 에이전트
        "RED → GREEN → REFACTOR"
      /commit
        "conventional commit 자동"
      /verify
        "lint + build + test"
    **React 전용**
      /react-review
        react-reviewer 에이전트
        react-patterns 스킬
        "hooks, 패턴, a11y"
      /react-test
        react-testing 스킬
        "컴포넌트 테스트"
      /next-build
        next-build-resolver 에이전트
        "hydration, RSC, 빌드에러"
    **빌드/에러**
      /build-fix
        build-error-resolver 에이전트
        "최소 수정으로 빌드 복구"
      /orchestrate bugfix
        explorer 에이전트
        "원인추적 → 테스트 → 수정"
    **코드 품질**
      /code-review
        code-reviewer 에이전트
        "보안 + 품질 리뷰"
      /orchestrate feature
        "plan → tdd → review → security"
      /refactor-clean
        refactor-cleaner 에이전트
        "데드코드 탐지 및 제거"
      /e2e
        e2e-runner 에이전트
        "Playwright E2E 테스트"
      /test-coverage
        "커버리지 분석 및 개선"
    **멀티 에이전트 파이프라인**
      /orchestrate-start
        "Jira → 요구사항 → 브랜치 → 플랜"
      /orchestrate-review
        "4명 전문가 병렬 리뷰"
        react-reviewer
        performance-reviewer
        security-reviewer
        architect
      /orchestrate-impl
        "Data + UI 병렬 → 통합 테스트"
      /orchestrate-done
        "검증 루프 → 리뷰 → PR"
    **Jira 연동**
      /jira-bug
        "Bug 이슈 생성"
      /jira-task
        "Task 이슈 생성"
    **문서**
      /update-docs
        doc-updater 에이전트
        "문서 + 코드맵 갱신"
    **학습 시스템**
      /learn
        "세션에서 패턴 추출"
      /skill-create
        "커스텀 스킬 생성"
      /evolve
        continuous-learning-v2 스킬
        "인스팅트 → 스킬 진화"
      /instinct-status
        "학습된 패턴 조회"
```

## 커맨드 → 에이전트 → 스킬 의존성

```mermaid
flowchart LR
    subgraph commands["슬래시 커맨드"]
        plan["/plan"]
        tdd["/tdd"]
        build["/build-fix"]
        cr["/code-review"]
        orch["/orchestrate"]
        rr["/react-review"]
        rt["/react-test"]
        nb["/next-build"]
        rc["/refactor-clean"]
        e2e["/e2e"]
        learn["/learn"]
        evolve["/evolve"]
        docs["/update-docs"]
        commit["/commit"]
        verify["/verify"]
        jbug["/jira-bug"]
        jtask["/jira-task"]
        tc["/test-coverage"]
        sc["/skill-create"]
        os["/orchestrate-start"]
        orv["/orchestrate-review"]
        oi["/orchestrate-impl"]
        od["/orchestrate-done"]
    end

    subgraph agents["에이전트"]
        a_plan["planner"]
        a_tdd["tdd-guide"]
        a_build["build-error-resolver"]
        a_cr["code-reviewer"]
        a_sec["security-reviewer"]
        a_arch["architect"]
        a_exp["explorer"]
        a_rr["react-reviewer"]
        a_nb["next-build-resolver"]
        a_rc["refactor-cleaner"]
        a_e2e["e2e-runner"]
        a_doc["doc-updater"]
        a_perf["performance-reviewer"]
    end

    subgraph skills["스킬 (지식 베이스)"]
        s_rp["react-patterns"]
        s_rt["react-testing"]
        s_rd["react-data-patterns"]
        s_sec["security-review"]
        s_cl2["continuous-learning-v2"]
        s_vl["verification-loop"]
        s_eval["eval-harness"]
    end

    plan --> a_plan
    tdd --> a_tdd
    build --> a_build
    cr --> a_cr
    orch --> a_plan & a_tdd & a_cr & a_sec & a_arch & a_exp
    rr --> a_rr
    nb --> a_nb
    rc --> a_rc
    e2e --> a_e2e
    docs --> a_doc
    evolve --> s_cl2
    sc --> s_cl2

    a_rr -.-> s_rp & s_rt & s_rd
    a_sec -.-> s_sec
    a_e2e -.-> s_vl

    commit -.- |"독립 실행"| commit
    verify -.- |"독립 실행"| verify
    jbug -.- |"Jira MCP"| jbug
    jtask -.- |"Jira MCP"| jtask
    tc -.- |"독립 실행"| tc
    rt -.- |"독립 실행"| rt

    os --> a_plan
    orv --> a_rr & a_perf & a_sec & a_arch
    oi --> |"병렬 에이전트"| oi
    od --> a_rr & a_perf & a_sec

    style commands fill:#1a1a2e,color:#fff
    style agents fill:#16213e,color:#fff
    style skills fill:#0f3460,color:#fff
```

## 워크플로우별 사용법

### 1. 새 기능 개발 (기본)

```mermaid
flowchart TD
    A["🎯 /plan 기능 설명"] --> B{"계획 OK?"}
    B -->|수정| A
    B -->|ㅇㅇ| C[코딩]
    C --> D["/react-review"]
    D --> E{이슈 있음?}
    E -->|있음| C
    E -->|없음| F["/verify"]
    F --> G{통과?}
    G -->|실패| H["/build-fix"]
    H --> F
    G -->|통과| I["/commit"]

    style A fill:#e94560,color:#fff
    style I fill:#0f3460,color:#fff
```

### 2. 새 기능 개발 (TDD)

```mermaid
flowchart TD
    A["🎯 /plan 기능 설명"] --> B{"계획 OK?"}
    B -->|ㅇㅇ| C["/tdd 기능 구현"]
    C --> D["🔴 테스트 작성 (실패)"]
    D --> E["🟢 최소 구현 (통과)"]
    E --> F["🔵 리팩토링"]
    F --> G{더 있음?}
    G -->|ㅇㅇ| D
    G -->|끝| H["/react-review"]
    H --> I["/verify"]
    I --> J["/commit"]

    style C fill:#e94560,color:#fff
    style D fill:#c62828,color:#fff
    style E fill:#2e7d32,color:#fff
    style F fill:#1565c0,color:#fff
```

### 3. 버그 수정

```mermaid
flowchart TD
    A["🐛 /orchestrate bugfix 설명"] --> B["explorer: 원인 추적"]
    B --> C["tdd-guide: 재현 테스트 작성"]
    C --> D["수정"]
    D --> E["code-reviewer: 리뷰"]
    E --> F["/verify"]
    F --> G["/commit"]

    style A fill:#e94560,color:#fff
```

### 4. 대규모 기능 (멀티 에이전트)

```mermaid
flowchart TD
    A["🚀 /orchestrate feature 설명"] --> B["planner: 계획 수립"]
    B --> C{"계획 OK?"}
    C -->|ㅇㅇ| D["tdd-guide: TDD 구현"]
    D --> E["code-reviewer: 코드 리뷰"]
    E --> F["security-reviewer: 보안 리뷰"]
    F --> G{이슈?}
    G -->|있음| D
    G -->|없음| H["/verify"]
    H --> I["/commit"]

    style A fill:#e94560,color:#fff
```

### 5. 멀티 에이전트 파이프라인 (orchestrate-*)

```mermaid
flowchart TD
    A["/orchestrate-start"] --> B["요구사항 Q&A"]
    B --> C["브랜치 생성"]
    C --> D["plans/*.md 작성"]
    D --> E["/orchestrate-review"]

    E --> F1["react-reviewer"]
    E --> F2["performance-reviewer"]
    E --> F3["security-reviewer"]
    E --> F4["architect"]

    F1 & F2 & F3 & F4 --> G{"CRITICAL/HIGH?"}
    G -->|있음| H["플랜 수정"] --> E
    G -->|없음| I["/orchestrate-impl"]

    I --> J1["Agent 1: Data Layer"]
    I --> J2["Agent 2: UI Components"]
    J1 & J2 --> K["Agent 3: Integration & Test"]

    K --> L["/orchestrate-done"]
    L --> M["검증 루프 (lint→build→test)"]
    M --> N{"통과?"}
    N -->|실패| O["수정"] --> M
    N -->|통과| P["3명 병렬 리뷰"]
    P --> Q["커밋 → PR 생성"]

    style A fill:#e94560,color:#fff
    style E fill:#f39c12,color:#fff
    style I fill:#2ecc71,color:#fff
    style L fill:#3498db,color:#fff
    style Q fill:#0f3460,color:#fff
```

### 6. 학습 시스템

```mermaid
flowchart TD
    A["일상 코딩 세션"] --> B["/learn"]
    B --> C["패턴 추출 → .claude/skills/"]
    C --> D["다음 세션에 자동 적용"]

    E["패턴 충분히 쌓임"] --> F["/evolve"]
    F --> G["인스팅트 → 스킬/커맨드/에이전트로 진화"]

    H["/instinct-status"] --> I["현재 학습된 패턴 조회"]
    J["/skill-create"] --> K["직접 커스텀 스킬 생성"]

    style B fill:#e94560,color:#fff
    style F fill:#e94560,color:#fff
```

## Rules가 하는 일 (자동, 유저 개입 없음)

```mermaid
flowchart LR
    subgraph rules["항상 자동 적용되는 룰"]
        direction TB
        r1["git-workflow: 브랜치/커밋 규칙"]
        r2["coding-style: 네이밍, 포맷"]
        r3["security: 보안 패턴 강제"]
        r4["testing: 테스트 규칙"]
        r5["patterns: 디자인 패턴"]
        r6["claude-usage: 모델 선택 가이드"]
        r7["typescript/*: TS 전용 규칙"]
        r8["pull-request: PR 템플릿 (Jira 키)"]
        r9["jira: Jira 이슈 규칙"]
    end

    Claude["Claude Code"] --> rules
    rules --> |"코드 작성 시<br/>자동 반영"| Output["더 나은 코드"]

    style rules fill:#1a1a2e,color:#fff
    style Claude fill:#e94560,color:#fff
```

## 프로젝트 커스터마이징

```mermaid
flowchart TD
    subgraph template["wiw_claude-code (공유)"]
        base["base/ (ECC)"]
        common["common/ (회사)"]
        stack["react-next/ (스택)"]
    end

    subgraph project["내 프로젝트 (로컬)"]
        claudemd["CLAUDE.md - 프로젝트 설명"]
        projrule[".claude/rules/project.md - 프로젝트 룰"]
        localagent[".claude/agents/my-agent.md"]
        localcmd[".claude/commands/my-cmd.md"]
        localskill[".claude/skills/my-skill/"]
        localmd["CLAUDE.local.md - 개인 설정"]
    end

    template -->|"setup.ps1"| project

    style template fill:#0f3460,color:#fff
    style project fill:#1a1a2e,color:#fff
    style claudemd fill:#e94560,color:#fff
    style projrule fill:#e94560,color:#fff
```

| 파일 | 용도 | git 커밋 |
|------|------|----------|
| `CLAUDE.md` | 프로젝트 개요, 기술 스택, 빌드 방법 | O |
| `.claude/rules/project.md` | 이 프로젝트만의 코딩 규칙 | O |
| `.claude/agents/my-*.md` | 프로젝트 전용 에이전트 | O |
| `.claude/commands/my-*.md` | 프로젝트 전용 커맨드 | O |
| `.claude/skills/my-*/` | 프로젝트 전용 스킬 | O |
| `CLAUDE.local.md` | 개인 설정 (gitignore) | X |
| `.claude/.env` | 토큰 (gitignore) | X |
