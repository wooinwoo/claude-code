# React/Next.js 프로젝트 가이드

## 전체 구조 마인드맵

```mermaid
mindmap
  root((React/Next.js<br/>Claude Code))
    **커맨드 (4개)**
      /orchestrate
        "4-Phase 파이프라인"
        "state.json 상태 추적"
      /commit
        "conventional commit 자동"
      /verify
        "lint + build + test"
      /jira
        "bug/task 이슈 생성"
    **자동 에이전트 (자연어로 호출)**
      planner
        "계획 세워줘"
      tdd-guide
        "TDD로 해줘"
      code-reviewer
        "코드 리뷰해줘"
      react-reviewer
        "React 리뷰해줘"
      build-error-resolver
        "빌드 고쳐줘"
      next-build-resolver
        "Next.js 빌드 에러"
      performance-reviewer
        "성능 점검해줘"
      security-reviewer
        "보안 점검해줘"
      refactor-cleaner
        "안 쓰는 코드 정리해줘"
      explorer
        "원인 찾아줘"
    **학습**
      /learn
        "패턴 추출/조회/진화 통합"
```

## 커맨드 → 에이전트 → 스킬 의존성

```mermaid
flowchart LR
    subgraph commands["슬래시 커맨드 (4개)"]
        orch["/orchestrate"]
        commit["/commit"]
        verify["/verify"]
        jira["/jira"]
    end

    subgraph agents["에이전트 (자동 발동)"]
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
    end

    orch --> a_plan & a_rr & a_perf & a_sec & a_arch

    a_rr -.-> s_rp & s_rt & s_rd
    a_sec -.-> s_sec
    a_e2e -.-> s_vl

    commit -.- |"독립 실행"| commit
    verify -.- |"독립 실행"| verify
    jira -.- |"Jira MCP"| jira

    style commands fill:#1a1a2e,color:#fff
    style agents fill:#16213e,color:#fff
    style skills fill:#0f3460,color:#fff
```

## 워크플로우별 사용법

### 1. 새 기능 개발

```mermaid
flowchart TD
    A["계획 세워줘"] --> B{"계획 OK?"}
    B -->|수정| A
    B -->|ㅇㅇ| C[구현]
    C --> D["리뷰해줘"]
    D --> E{이슈 있음?}
    E -->|있음| C
    E -->|없음| F["/verify"]
    F --> G{통과?}
    G -->|실패| H["빌드 고쳐줘"]
    H --> F
    G -->|통과| I["/commit"]

    style A fill:#e94560,color:#fff
    style I fill:#0f3460,color:#fff
```

### 2. 버그 수정

```mermaid
flowchart TD
    A["원인 찾아줘"] --> B["explorer: 코드 추적"]
    B --> C["TDD로 수정해줘"]
    C --> D["수정 + 테스트"]
    D --> E["/verify"]
    E --> F["/commit"]

    style A fill:#e94560,color:#fff
```

### 3. 멀티 에이전트 파이프라인

```mermaid
flowchart TD
    A["/orchestrate 기능 설명"] --> B["Phase 1: 요구사항 Q&A"]
    B --> C["브랜치 생성 + plans/*.md 작성"]
    C --> D["state.json → phase: review"]

    D --> E["/orchestrate (자동 Phase 2)"]
    E --> F1["react-reviewer"]
    E --> F2["performance-reviewer"]
    E --> F3["security-reviewer"]
    E --> F4["architect"]

    F1 & F2 & F3 & F4 --> G{"CRITICAL/HIGH?"}
    G -->|있음| H["플랜 수정"] --> E
    G -->|없음| I["state.json → phase: impl"]

    I --> J["/orchestrate (자동 Phase 3)"]
    J --> J1["Agent 1: Data Layer"]
    J --> J2["Agent 2: UI Components"]
    J1 & J2 --> K["Agent 3: Integration & Test"]

    K --> L["state.json → phase: done"]
    L --> M["/orchestrate (자동 Phase 4)"]
    M --> N["검증 루프 (lint→build→test)"]
    N --> O{"통과?"}
    O -->|실패| P["수정"] --> N
    O -->|통과| Q["3명 병렬 리뷰"]
    Q --> R["커밋 → PR 생성"]

    style A fill:#e94560,color:#fff
    style E fill:#f39c12,color:#fff
    style J fill:#2ecc71,color:#fff
    style M fill:#3498db,color:#fff
    style R fill:#0f3460,color:#fff
```

### 4. 학습 시스템

```mermaid
flowchart TD
    A["일상 코딩 세션"] --> B["/learn"]
    B --> C["패턴 추출 → .claude/skills/"]
    C --> D["다음 세션에 자동 적용"]

    E["패턴 충분히 쌓임"] --> F["/learn evolve"]
    F --> G["인스팅트 → 스킬/커맨드/에이전트로 진화"]

    H["/learn status"] --> I["현재 학습된 패턴 조회"]

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
