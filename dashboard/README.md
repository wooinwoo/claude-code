# Claude Code Dashboard

여러 프로젝트의 Claude Code 세션, Git 상태, GitHub PR, 사용량을 한 화면에서 모니터링하고 관리하는 로컬 대시보드.

```
http://localhost:3847
```

## 주요 기능

### Overview 탭
- **프로젝트 카드** — 등록된 프로젝트별 Claude 세션 상태 (active/idle/none), 현재 브랜치, uncommitted 파일 수, 최근 커밋
- **GitHub PR** — 프로젝트별 열린 PR 목록 (리뷰 상태, draft 여부)
- **사용량 통계** — 오늘/이번 주/전체 토큰 사용량, 모델별 비용 추정
- **최근 활동** — 전체 프로젝트의 Claude 세션 활동 타임라인

### Terminal 탭
- **WebSocket 기반 터미널** — 브라우저에서 직접 프로젝트 디렉토리의 터미널 사용 (`node-pty` + `xterm.js`)
- **브랜치/워크트리 선택** — 터미널 생성 시 브랜치나 Git worktree 경로 선택 가능
- **다중 터미널** — 여러 프로젝트의 터미널을 탭으로 관리
- **세션 상태 저장** — 서버 재시작 시 터미널 세션 자동 복원

### Changes 탭
- **Git Diff 뷰어** — Staged/Unstaged 파일을 분리해서 표시, 파일별 라인넘버 + 구문 하이라이팅
- **파일 사이드바** — 변경 파일 목록 (상태 아이콘 A/M/D/R), 클릭하면 해당 파일로 스크롤
- **Stage/Unstage/Discard** — 파일 단위 Git 스테이징 관리
- **수동 커밋** — 메시지 입력 후 직접 커밋
- **현재 브랜치 표시** — 툴바에 브랜치명과 워크트리 수 표시
- **AI Auto Commit** — Haiku 모델이 변경사항을 분석해서 논리적 커밋 단위로 자동 분류

### AI Auto Commit
Claude Haiku가 `git status` + `git diff`를 분석해서 관련 파일을 논리적 커밋으로 그룹핑합니다.

**워크플로우:**
1. "AI Commit" 버튼 클릭 → Haiku가 변경사항 분석 (3~5초)
2. 커밋 플랜 표시: 커밋별 메시지 + 파일 목록 + 이유
3. 사용자가 플랜 수정:
   - 커밋 메시지 인라인 편집
   - 파일을 커밋 간 드래그 앤 드롭으로 이동
   - 파일을 "대기(Pending)" 영역으로 내려서 커밋에서 제외
   - 대기 파일을 다시 커밋으로 올리기
   - 새 커밋 추가 / 커밋 삭제 (삭제 시 파일은 대기로 이동)
4. "Commit All" 클릭 → 순차적으로 커밋 실행 (프로그레스 바)
5. 완료 후 "Push" 버튼으로 원격에 푸시

**안전장치:**
- `main`/`master` 브랜치에서 커밋 시 확인 다이얼로그
- 파일 없는 빈 커밋은 자동 스킵
- 커밋 실패 시 해당 카드에 에러 표시, 나머지 중단

### Dev Server 관리
- 프로젝트별 개발 서버 시작/중지 (`devCmd` 설정 필요)
- stdout/stderr에서 포트 자동 감지
- 실행 중인 서버 목록 실시간 표시

### IDE 연동
- 프로젝트 카드에서 원클릭으로 IDE 열기
- 지원 IDE: VS Code, Cursor, Windsurf, Antigravity

## 아키텍처

```
┌─────────────┐     HTTP/SSE      ┌──────────────────────────────────┐
│  Browser    │◄──────────────────►│  Node.js Server (port 3847)     │
│  (SPA)      │     WebSocket     │                                  │
│  index.html │◄──────────────────►│  server.js                      │
└─────────────┘                    │    ├─ lib/config.js       설정   │
                                   │    ├─ lib/claude-data.js  세션   │
                                   │    ├─ lib/git-service.js  Git    │
                                   │    ├─ lib/github-service.js PR   │
                                   │    ├─ lib/cost-service.js 비용   │
                                   │    ├─ lib/session-control.js     │
                                   │    └─ lib/poller.js       폴링   │
                                   └──────────┬───────────────────────┘
                                              │
                              ┌───────────────┼──────────────────┐
                              │               │                  │
                         ~/.claude/      git CLI          claude CLI
                         (세션/비용)    (status/diff)    (AI commit)
```

**프론트엔드:** 단일 `index.html` (인라인 CSS + JS, 외부 의존성 없음)
**백엔드:** 순수 Node.js HTTP 서버 (프레임워크 없음)
**실시간:** SSE (Server-Sent Events)로 폴링 데이터 푸시, WebSocket으로 터미널 스트리밍
**터미널:** `node-pty`로 실제 PTY 프로세스 생성, `ws`로 브라우저와 양방향 연결

## 파일 구조

```
dashboard/
├── server.js              메인 서버 (HTTP + SSE + WebSocket + API 라우트)
├── index.html             프론트엔드 SPA (HTML + CSS + JS 올인원, ~170KB)
├── lib/
│   ├── config.js          프로젝트 설정, 경로, 폴링 주기, 색상
│   ├── claude-data.js     ~/.claude/ 에서 세션 상태·이력 읽기
│   ├── git-service.js     git CLI 래퍼 (status, branch, worktree, remote)
│   ├── github-service.js  gh CLI 래퍼 (PR 목록)
│   ├── cost-service.js    Claude 사용량/비용 계산
│   ├── session-control.js Claude 세션 시작/재개 (spawn)
│   └── poller.js          주기적 폴링 + SSE 브로드캐스트 엔진
├── projects.json          등록된 프로젝트 목록 (서버가 읽고 씀)
├── package.json           의존성: node-pty, ws
├── autostart.bat          Windows 로그인 시 자동 실행 스크립트
├── setup-autostart.ps1    Windows 작업 스케줄러 등록 스크립트
└── PLAN.md                Changes 탭 설계 문서
```

## 설치 및 실행

### 사전 요구사항

- **Node.js** 20+
- **Git** (PATH에 등록)
- **Claude Code CLI** (`claude` 명령어 사용 가능, OAuth 인증 완료 상태)
- **gh CLI** (GitHub PR 기능 사용 시, 선택)

### 설치

```powershell
cd C:\_project\template\wiw_claude-code\dashboard
npm install
```

> `node-pty`는 네이티브 모듈이라 C++ 빌드 도구가 필요할 수 있음
> Windows: `npm install --global windows-build-tools` 또는 Visual Studio Build Tools

### 실행

```powershell
# 직접 실행
node server.js

# 또는
npm start
```

브라우저가 자동으로 `http://localhost:3847`을 엽니다.

### Windows 자동 시작 등록 (선택)

로그인 시 대시보드가 자동으로 백그라운드 실행됩니다.

```powershell
# 관리자 권한으로 실행
powershell -ExecutionPolicy Bypass -File .\setup-autostart.ps1
```

해제:
```powershell
schtasks /delete /tn ClaudeCodeDashboard /f
```

## 프로젝트 등록

### UI에서 등록

대시보드 Overview 탭 상단의 "+" 버튼으로 프로젝트 추가/편집/삭제 가능.

### 직접 편집

`projects.json`을 직접 편집할 수도 있습니다:

```json
{
  "projects": [
    {
      "id": "my-project",
      "name": "My Project",
      "path": "C:/_project/service/my-project",
      "stack": "react-next",
      "color": "#3B82F6",
      "devCmd": "npm run dev"
    }
  ]
}
```

| 필드 | 필수 | 설명 |
|------|------|------|
| `id` | 자동 | 프로젝트 고유 ID (name에서 자동 생성) |
| `name` | O | 표시 이름 |
| `path` | O | 프로젝트 루트 경로 (슬래시 `C:/_project/...` 형식) |
| `stack` | X | `react-next` \| `nestjs` 등 (표시용) |
| `color` | 자동 | 카드 색상 (name 해시에서 자동 생성) |
| `devCmd` | X | 개발 서버 실행 명령어 (예: `npm run dev`) |

## API 엔드포인트

### 프로젝트 관리

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/projects` | 프로젝트 목록 |
| POST | `/api/projects` | 프로젝트 추가 |
| PUT | `/api/projects/:id` | 프로젝트 수정 |
| DELETE | `/api/projects/:id` | 프로젝트 삭제 |

### 모니터링

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/events` | SSE 스트림 (실시간 데이터) |
| GET | `/api/projects/:id/git` | Git 상태 (branch, uncommitted, worktrees) |
| GET | `/api/projects/:id/prs` | GitHub PR 목록 |
| GET | `/api/projects/:id/sessions` | Claude 세션 이력 |
| GET | `/api/projects/:id/branches` | 브랜치 + 워크트리 목록 |
| GET | `/api/usage` | 전체 사용량 요약 |
| GET | `/api/cost/daily` | 일별 비용 데이터 |
| GET | `/api/activity` | 최근 활동 타임라인 |
| GET | `/api/stats` | 캐시된 통계 |

### Git 작업

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/projects/:id/diff` | Staged + Unstaged diff |
| POST | `/api/projects/:id/git/stage` | 파일 스테이징 |
| POST | `/api/projects/:id/git/unstage` | 스테이징 해제 |
| POST | `/api/projects/:id/git/discard` | 변경사항 버리기 |
| POST | `/api/projects/:id/git/commit` | 수동 커밋 |
| POST | `/api/projects/:id/push` | git push |

### AI Auto Commit

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/projects/:id/auto-commit/plan` | Haiku로 커밋 플랜 생성 |
| POST | `/api/projects/:id/auto-commit/execute` | 단일 커밋 실행 |

### Dev Server

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/dev-servers` | 실행 중인 서버 목록 |
| POST | `/api/projects/:id/dev-server/start` | 개발 서버 시작 |
| POST | `/api/projects/:id/dev-server/stop` | 개발 서버 중지 |

### 기타

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/projects/:id/open-ide` | IDE 열기 (body: `{ide}`) |
| GET | `/api/scripts-by-path` | package.json scripts 조회 |
| POST | `/api/sessions/:id/start` | Claude 세션 시작 |
| POST | `/api/sessions/:id/resume` | Claude 세션 재개 |
| GET | `/api/browse` | 디렉토리 탐색 |

## 폴링 주기

| 데이터 | 주기 | 설명 |
|--------|------|------|
| 세션 상태 | 5초 | Claude 프로세스 감지 |
| Git 상태 | 30초 | branch, uncommitted 등 |
| PR 상태 | 2분 | GitHub PR 목록 |
| 비용 데이터 | 1분 | 토큰 사용량/비용 |
| 활동 로그 | 10초 | 최근 세션 활동 |

SSE를 통해 변경사항만 브라우저에 push하므로, 프론트엔드에서 별도 폴링 없이 실시간 업데이트됩니다.

## 기술 스택

| 영역 | 기술 |
|------|------|
| 서버 | Node.js (순수 `http` 모듈, 프레임워크 없음) |
| 프론트엔드 | Vanilla HTML/CSS/JS (SPA, 빌드 도구 없음) |
| 터미널 | `node-pty` (서버) + `xterm.js` (CDN, 클라이언트) |
| WebSocket | `ws` |
| 실시간 | Server-Sent Events (SSE) |
| AI | Claude CLI (`claude -p --model haiku`) via OAuth |
| Git | `git` CLI (child_process) |
| GitHub | `gh` CLI (child_process) |

**외부 서비스 의존성 없음** — 모든 데이터는 로컬 파일시스템(`~/.claude/`)과 Git CLI에서 읽습니다.
AI Auto Commit만 Claude API를 사용하며, 기존 Claude Code OAuth 인증을 그대로 활용합니다.

## 보안

- **localhost 전용** — 외부 네트워크에서 접근 불가
- **인증 없음** — 로컬 개발 도구이므로 별도 인증 레이어 없음
- **쓰기 API 존재** — `git commit`, `git push`, `discard` 등 파괴적 작업 포함
- **환경 변수 불필요** — Claude OAuth는 CLI가 자체 관리 (`~/.claude/.credentials.json`)
