# wiw_claude-code

회사 프로젝트용 Claude Code 설정 템플릿

## 개요

[everything-claude-code(ECC)](https://github.com/affaan-m/everything-claude-code)를 베이스로,
회사 공통 규칙과 스택별(React/Next.js, NestJS) 전용 설정을 추가한 템플릿입니다.

각 프로젝트는 이 레포 하나만 참조하면 됩니다.

```
ECC (업스트림) ──sync.ps1──→ wiw_claude-code ──setup.ps1──→ 각 프로젝트
                              (단일 소스)                  (junction 자동 반영)
```

## 구조

```
wiw_claude-code/
│
├── base/                    ECC에서 동기화 (sync.ps1로 관리, 직접 수정 X)
│   ├── agents/              ECC 에이전트 (10개: planner, architect, tdd-guide 등)
│   ├── commands/            ECC 커맨드 (3개: orchestrate, verify, learn)
│   ├── rules/               ECC 규칙
│   │   ├── common/          공통 (git-workflow, security, testing 등)
│   │   └── typescript/      TypeScript 전용 (patterns, coding-style 등)
│   ├── skills/              ECC 스킬 (security-review, verification-loop, continuous-learning-v2 등)
│   ├── hooks/               ECC 훅 설정
│   ├── contexts/            ECC 컨텍스트 (dev, research, review)
│   ├── scripts/             ECC 스크립트 (hooks, lib)
│   └── _excluded/           exclude.json으로 제외된 항목 (참조용, junction 안 걸림)
│       ├── agents/          go-build-resolver, go-reviewer, python-reviewer
│       ├── commands/        go-*, python-*, multi-*, pm2, sessions, checkpoint
│       ├── skills/          django-*, springboot-*, golang-*, python-*, java-*, jpa-*
│       └── rules/           golang/, python/
│
├── common/                  회사 공통 추가 (ECC에 없는 것만)
│   ├── rules/
│   │   ├── pull-request.md  PR 작성 가이드 (제목 규칙, Jira 키 연동, 본문 템플릿)
│   │   └── jira.md          Jira 이슈 생성 규칙 (Task/Bug/Story 템플릿, MCP 도구)
│   ├── commands/
│   │   ├── commit.md        /commit 커맨드
│   │   └── jira.md          /jira bug|task 통합 커맨드
│   ├── scripts/             MCP 서버 래퍼 스크립트
│   │   ├── run-github-mcp.cjs  GitHub MCP (.env에서 PAT 로드)
│   │   └── run-jira-mcp.cjs    Jira MCP (.env에서 토큰 로드)
│   ├── mcp-configs/
│   │   └── mcp-servers.json MCP 서버 설정 템플릿 (settings.local.json에 복사)
│   └── .env.example         환경 변수 템플릿 (GITHUB_PAT, JIRA_TOKEN 등)
│
├── react-next/              React/Next.js 전용 추가
│   ├── agents/
│   │   ├── react-reviewer.md       React 코드 리뷰 에이전트
│   │   ├── performance-reviewer.md 성능 전문가 에이전트 (Core Web Vitals, 번들, 렌더링)
│   │   └── next-build-resolver.md  Next.js 빌드 에러 해결 에이전트
│   ├── commands/
│   │   └── orchestrate.md          /orchestrate 4-Phase 파이프라인 (상태 추적)
│   └── skills/
│       ├── react-patterns/         React 컴포넌트 패턴
│       ├── react-testing/          React 테스팅 가이드
│       └── react-data-patterns/    데이터 페칭 패턴
│
├── nestjs/                  NestJS 전용 추가
│   ├── rules/
│   │   ├── backend-architecture.md  헥사고날 아키텍처 가이드 (Small/Medium/Large 스케일별)
│   │   └── nestjs-e2e-testing.md    E2E 테스트 작성 규칙 (필수/불필요 테스트 기준)
│   ├── agents/
│   │   └── schema-designer.md       DB 스키마 설계 에이전트
│   └── commands/
│       ├── orchestrate.md           /orchestrate 4-Phase 파이프라인 (상태 추적)
│       └── wt.md                    /wt new|list|sync|rm 통합 커맨드
│
├── exclude.json             ECC에서 제외할 항목 매핑 (sync.ps1이 참조)
├── sync.ps1                 ECC → base/ 동기화 + exclude 처리
├── setup.ps1                프로젝트 설치 스크립트
├── VERSION                  현재 버전 (1.0.0)
└── README.md
```

## 사용법

### 사전 준비

1. 이 레포를 clone
2. ECC 레포를 clone (관리자만)

```powershell
git clone <wiw_claude-code repo> C:\_project\template\wiw_claude-code
git clone https://github.com/affaan-m/everything-claude-code C:\_project\template\everything-claude-code
```

### 관리자: ECC 업데이트 반영

ECC에 업데이트가 있을 때 실행합니다.

```powershell
# 1. ECC 최신화
cd C:\_project\template\everything-claude-code
git pull

# 2. wiw base/ 에 동기화
cd C:\_project\template\wiw_claude-code
.\sync.ps1

# 3. 변경사항 배포
git add .
git commit -m "chore: sync ecc"
git push
```

sync.ps1은 base/ 폴더만 갱신합니다. common/, react-next/, nestjs/ 는 건드리지 않습니다.
`exclude.json`에 정의된 항목은 자동으로 `base/_excluded/`로 이동됩니다.

### 관리자: 제외 항목 관리

`exclude.json`을 편집하여 ECC에서 가져올 항목을 제어합니다.

```jsonc
// exclude.json - 제외할 항목 (나머지는 전부 포함)
{
  "rules": ["golang", "python"],           // 폴더 단위
  "agents": ["go-reviewer.md"],            // 파일 단위
  "commands": ["go-build.md", "pm2.md"],   // 파일 단위
  "skills": ["django-patterns"]            // 폴더 단위
}
```

- **제외 해제**: 항목을 지우면 다음 sync 시 `base/`에 포함됨
- **제외 추가**: 항목을 추가하면 다음 sync 시 `_excluded/`로 이동
- **파일 삭제 없음**: 제외된 파일도 `_excluded/`에 보관 (참조 가능)

### 개발자: 프로젝트에 설치 (최초 1회)

```powershell
cd C:\_project\template\wiw_claude-code

# React/Next.js 프로젝트
.\setup.ps1 react-next C:\path\to\my-react-project

# NestJS 프로젝트
.\setup.ps1 nestjs C:\path\to\my-nestjs-project
```

setup.ps1이 하는 일:
- `rules/` junction 생성 (자동 반영)
- `agents/`, `commands/`, `skills/` 파일 복사
- `hooks/`, `contexts/`, `scripts/` junction 생성 (자동 반영)
- MCP 스크립트/설정 junction 생성 (`scripts-wiw/`, `mcp-configs/`)
- `.claude/.env` 생성 (`.env.example`에서 복사, 토큰 직접 입력)
- `CLAUDE.md` 초안 생성 (없을 때만)
- `.gitignore` 업데이트

### 개발자: 업데이트 받기

```powershell
cd C:\_project\template\wiw_claude-code
git pull

# rules/hooks/contexts/scripts → junction이라 자동 반영
# agents/commands/skills → 재설치 필요:
.\setup.ps1 react-next C:\path\to\my-project
```

## 프로젝트에 설치되는 내역

setup.ps1 실행 후 프로젝트의 `.claude/` 구조:

```
my-project/
├── CLAUDE.md                              직접 작성 (프로젝트 고유)
└── .claude/
    ├── rules/                             junction (자동 반영)
    │   ├── base-common/            → wiw/base/rules/common/
    │   ├── base-typescript/        → wiw/base/rules/typescript/
    │   ├── wiw-common/             → wiw/common/rules/
    │   ├── wiw-[stack]/            → wiw/[stack]/rules/
    │   └── project.md              직접 작성 (프로젝트 전용 규칙, 선택)
    ├── agents/                            복사 (setup.ps1 재실행으로 갱신)
    │   ├── architect.md             ← base/agents/
    │   ├── react-reviewer.md        ← [stack]/agents/
    │   └── ...
    ├── commands/                          복사 (setup.ps1 재실행으로 갱신)
    │   ├── build-fix.md             ← base/commands/
    │   ├── commit.md                ← common/commands/
    │   ├── react-review.md          ← [stack]/commands/
    │   └── ...
    ├── skills/                            복사 (setup.ps1 재실행으로 갱신)
    │   ├── security-review/         ← base/skills/
    │   ├── react-patterns/          ← [stack]/skills/
    │   └── ...
    ├── hooks/                      → junction → wiw/base/hooks/
    ├── contexts/                   → junction → wiw/base/contexts/
    ├── scripts/                    → junction → wiw/base/scripts/
    ├── scripts-wiw/                → junction → wiw/common/scripts/
    ├── mcp-configs/                → junction → wiw/common/mcp-configs/
    └── .env                        ← .env.example에서 복사됨
```

- **junction** (rules, hooks, contexts, scripts 등): wiw_claude-code git pull 시 자동 반영
- **복사** (agents, commands, skills): wiw_claude-code git pull 후 `setup.ps1` 재실행 필요

## 프로젝트 고유 설정

junction으로 연결되지 않는, 프로젝트에서 직접 관리하는 파일:

| 파일 | 용도 | 필수 |
|------|------|------|
| `CLAUDE.md` | 프로젝트 개요, 기술 스택, 고유 규칙 | O (setup.ps1이 초안 생성) |
| `.claude/rules/project.md` | 프로젝트 전용 규칙 | X (필요시 직접 생성) |
| `.claude/settings.local.json` | 로컬 설정 (MCP 서버 등) | X (필요시 직접 생성) |
| `CLAUDE.local.md` | 개인 설정 (gitignore됨) | X |

## MCP 서버 설정

setup.ps1 실행 후 MCP 서버를 활성화하는 방법:

### 1. .env에 토큰 입력

```powershell
# .claude/.env 파일 편집 (setup.ps1이 자동 생성)
notepad .claude\.env
```

```env
GITHUB_PAT=ghp_xxxxxxxxxxxx
JIRA_URL=https://yourcompany.atlassian.net
JIRA_USERNAME=your-email@company.com
JIRA_TOKEN=ATATTxxxxxxxx
```

### 2. settings.local.json에 MCP 서버 등록

`.claude/mcp-configs/mcp-servers.json`에서 필요한 서버를 복사하여
프로젝트 루트의 `.claude.json` 또는 `.claude/settings.local.json`에 추가:

```json
{
  "mcpServers": {
    "github": {
      "command": "node",
      "args": [".claude/scripts-wiw/run-github-mcp.cjs"],
      "description": "GitHub - PR, issue, repo 관리"
    },
    "mcp-atlassian": {
      "command": "node",
      "args": [".claude/scripts-wiw/run-jira-mcp.cjs"],
      "description": "Jira - 이슈 조회/생성"
    }
  }
}
```

래퍼 스크립트(`run-github-mcp.cjs`, `run-jira-mcp.cjs`)가 `.claude/.env`에서 토큰을 자동으로 읽으므로, 설정 파일에 토큰을 직접 노출하지 않아도 됩니다.

### 사용 가능한 MCP 서버

| 서버 | 용도 | 토큰 필요 |
|------|------|----------|
| github | PR/Issue/Repo 관리 | GITHUB_PAT |
| mcp-atlassian | Jira 이슈 조회/생성 | JIRA_TOKEN, JIRA_URL, JIRA_USERNAME |
| memory | 세션 간 영구 메모리 | X |
| context7 | npm/프레임워크 라이브 문서 조회 | X |
| magic | Magic UI 컴포넌트 | X |

## 회사 규칙 추가/수정

### 공통 규칙 추가

모든 프로젝트에 적용할 규칙:

```powershell
# common/rules/ 에 파일 추가
# 예: common/rules/logging.md
git add . && git commit -m "feat: add logging rule" && git push
```

### 스택별 규칙 추가

특정 스택에만 적용할 규칙:

```powershell
# react-next/ 또는 nestjs/ 에 파일 추가
# 예: nestjs/rules/database-migration.md
git add . && git commit -m "feat(nestjs): add migration rule" && git push
```

### 주의: base/ 는 직접 수정 금지

base/ 폴더는 sync.ps1이 덮어쓰므로 직접 수정하면 안 됩니다.
ECC 규칙을 수정하고 싶으면 common/ 또는 스택 폴더에 같은 이름의 파일을 만들어 override하세요.

## Dashboard

여러 프로젝트의 Claude Code 세션, Git, PR, 사용량을 한 화면에서 모니터링하는 로컬 대시보드.

```powershell
cd dashboard && npm install && npm start
# http://localhost:3847
```

주요 기능: 프로젝트 상태 모니터링, WebSocket 터미널, Git diff 뷰어, AI Auto Commit (Haiku), Dev Server 관리, IDE 연동

상세 문서: [dashboard/README.md](dashboard/README.md)

## 출처

| 폴더 | 출처 | 설명 |
|------|------|------|
| base/ | [everything-claude-code](https://github.com/affaan-m/everything-claude-code) | 커뮤니티 Claude Code 베스트 프랙티스 |
| common/rules/pull-request.md | srpn_.claude 자체 작성 | Jira 키 연동 PR 가이드 |
| common/rules/jira.md | srpn_.claude 자체 작성 | Jira 이슈 생성 템플릿 |
| nestjs/rules/ | srpn_.claude 자체 작성 | 헥사고날 아키텍처 + E2E 테스트 규칙 |
| react-next/agents/ | bid-ai-site 자체 작성 | React/Next.js 전용 에이전트 |
| react-next/skills/ | bid-ai-site 자체 작성 | React 패턴/테스팅 스킬 |
