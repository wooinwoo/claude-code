// ─── Main Entry Point: imports, init, keyboard shortcuts, window.xxx wiring ───
import { app } from './state.js';
import { esc, showToast, simpleMarkdown } from './utils.js';

// ─── Dashboard module ───
import {
  notifySessionChange, updateClock, startClock, connectSSE,
  updateSummaryStats, switchView, renderCard, cardHTML, renderAllCards,
  renderSkeletons, setChartPeriod, renderCosts, fetchUsage, renderUsage,
  updateUsageTimestamp, showConvList, closeConvList, applyTheme, toggleTheme,
  savePins, togglePin, sortAndRenderProjects, toggleNotifications,
  isNotifEnabledForProject, saveNotifFilter, toggleProjectNotif,
  setProjectFilter, filterProjects, fetchAllProjects, updateScrollIndicators,
  jumpToChanges, onVisibilityChange,
} from './dashboard.js';

// ─── Terminal module ───
import {
  connectWS, addTerminal, renderLayout, fitAllTerminals, debouncedFit,
  updateTermHeaders, debouncedUpdateTermHeaders, closeTerminal,
  openNewTermModal, createTerminal, openTermWith, showTermCtxMenu,
  toggleTermSearch, closeTermSearch, doTermSearch, exportTerminal,
  changeTermFontSize, showDisconnectIndicator, setupTermEventDelegation,
  startRenameHeader, saveLayout, restoreSavedLayout,
  loadBranchesForTerm, selectBranch, initFileDrop,
} from './terminal.js';

// ─── Diff module ───
import {
  renderDiffTableFull, scrollToDiffPanel, debouncedLoadDiff, loadDiff,
  diffStageFile, diffUnstageFile, diffDiscardFile,
  diffStageAll, diffUnstageAll, diffDiscardAll,
  diffExpandAll, diffCollapseAll, filterDiffFiles,
  doManualCommit, generateCommitMsg, updateDiffBranchInfo,
  toggleBranchDropdown, filterBranchDropdown, switchBranch, toggleWorktreeDropdown,
  startAutoCommit, cancelAutoCommit, executeAutoCommit, doPush,
  doPull, doFetch, doStash, doStashPop,
  createBranch, deleteBranch,
  saveCommitMsg, restoreCommitMsg, clearCommitMsg,
} from './diff.js';

// ─── Modals module ───
import {
  openSettingsPanel, closeSettingsPanel,
  openAddProjectModal, editProject, saveProject, loadPkgScripts, pickScript,
  toggleFolderPicker, closeFolderPicker, browseTo, selectCurrentFolder,
  confirmDeleteProject, refreshProjectList, populateProjectSelects,
  promptDevCmd, setDevCmd, toggleDevServer, showDevServerDialog, updateDevBadge,
  openIDE, openGitHub, openStartModal, doStartSession,
  resumeLastSession, showShortcutHelp, hideShortcutHelp,
  toggleCommandPalette, openCommandPalette, closeCommandPalette,
  filterCommands, setCmdActive, execCmd, setupCommandPaletteListeners,
  exportSettings, importSettings,
  openDiscoverModal, toggleDiscoverItem, toggleDiscoverSelectAll, addDiscoveredProjects,
  setupErrorLogCapture, openErrorLog, clearErrorLog,
  openNotifSettings, renderNotifFilterList,
  showGitLog, showSessionHistory, resumeSessionFromHistory,
  openFilePreview, openFilePreviewFromFile, closeFilePreview,
  copyFilePathToClipboard, copyFileContent, insertPathToTerminal,
  hideCtxMenu, showCtxMenu, ICON, getFilePathAtPosition, openInIde, openContainingFolder,
  setupCtxMenuListeners,
} from './modals.js';

// ─── README Content ───
const README_CONTENT = `# Cockpit

여러 프로젝트의 Claude Code 세션, Git 상태, GitHub PR, 사용량을 한 화면에서 모니터링하고 관리하는 로컬 대시보드.

\`http://localhost:3847\`

---

## Features

### Overview (Dashboard)
- **Project Cards** — 프로젝트별 Claude 세션 상태 (active/idle/none), 현재 브랜치, 모델, uncommitted 파일 수, 최근 커밋, PR 상태를 실시간 표시
- **Project Search** — 이름, 스택, 상태로 필터링
- **Cost & Usage** — 오늘/이번 주/전체 토큰 사용량, 모델별 비용 추정, Chart.js 차트
- **Dev Server** — 프로젝트별 개발 서버 시작/중지, stdout에서 포트 자동 감지, 클릭하면 브라우저에서 열기
- **IDE 연동** — VS Code, Cursor, Windsurf, Antigravity 원클릭 실행
- **GitHub** — 프로젝트별 열린 PR 목록 (리뷰 상태, draft 여부), 원클릭으로 GitHub 열기

### Terminal
- **Multi-terminal** — 여러 프로젝트의 터미널을 탭으로 관리, 분할(가로/세로)
- **Tab Bar** — 빠른 전환, 가운데 클릭으로 닫기, 드래그로 순서 변경
- **Branch/Worktree Picker** — 터미널 생성 시 브랜치나 Git worktree 경로 선택
- **Search** — Ctrl+F로 터미널 출력 내 검색
- **세션 복원** — 서버 재시작 시 터미널 세션 자동 복원

### Changes (Git Diff)
- **2-Column Diff View** — 파일 사이드바 + 파일별 접기/펼치기 가능한 diff 패널
- **Staged/Unstaged** — 컬러 인디케이터로 구분 (인디고=staged, 옐로우=unstaged)
- **Line Numbers** — old/new 라인넘버 거터
- **Stage/Unstage/Discard** — 파일 단위 Git 스테이징 관리
- **수동 커밋** — 메시지 입력 후 직접 커밋 + Push
- **브랜치 표시** — 툴바에 현재 브랜치명과 워크트리 수 표시

### AI Auto Commit
Claude Haiku가 \`git status\` + \`git diff\`를 분석해서 관련 파일을 논리적 커밋으로 자동 그룹핑.

**워크플로우:**
1. "AI Commit" 버튼 → Haiku가 변경사항 분석 (3~5초)
2. 커밋 플랜 표시: 커밋별 메시지 + 파일 목록 + 이유
3. 사용자가 플랜 수정:
   - 커밋 메시지 인라인 편집
   - 파일을 커밋 간 **드래그 앤 드롭**으로 이동
   - 파일을 **대기(Pending)** 영역으로 내려서 커밋에서 제외
   - 대기 파일을 다시 커밋으로 올리기 (화살표 클릭)
   - **새 커밋 추가** / **커밋 삭제** (삭제 시 파일은 대기로 이동)
4. "Commit All" → 순차적으로 커밋 실행 (프로그레스 바)
5. 완료 후 "Push" 버튼으로 원격에 푸시

**안전장치:**
- \`main\`/\`master\` 브랜치에서 커밋 시 확인 다이얼로그
- 파일 없는 빈 커밋은 자동 스킵
- 커밋 실패 시 해당 카드에 에러 표시, 나머지 중단

> AI는 Claude CLI (\`claude -p --model haiku\`)를 통해 호출되므로 별도 API 키 불필요 — 기존 OAuth 인증 그대로 사용

---

## New Features

### Git Operations
- **Pull/Fetch** — Changes 탭 툴바에서 Git Pull/Fetch 원클릭
- **Stash/Pop** — 작업 중 변경사항 임시 저장 및 복원
- **Branch Create** — 드롭다운에서 새 브랜치 직접 생성
- **Branch Delete** — 사용 안하는 로컬 브랜치 삭제 (main/master 보호)

### UX
- **Project Pin** — 카드 별표로 즐겨찾기, 핀된 프로젝트 앞으로 정렬
- **Theme Toggle** — 다크/라이트 테마 전환 (헤더 버튼)
- **Shortcut Help** — ? 키로 단축키 오버레이

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+1 | Overview 탭 |
| Ctrl+2 | Terminal 탭 |
| Ctrl+3 | Changes 탭 |
| Ctrl+4 | README 탭 |
| Ctrl+T | 새 터미널 |
| Ctrl+W | 터미널 닫기 |
| Ctrl+F | 터미널 내 검색 |
| Ctrl+Tab | 다음 터미널 |
| Ctrl+Shift+Tab | 이전 터미널 |
| Ctrl+[ / ] | 이전/다음 터미널 |
| ? | 단축키 도움말 |
| Escape | 오버레이 / 검색 닫기 |

---

## Architecture

\`\`\`
Browser (SPA)          Node.js Server (port 3847)
┌─────────────┐  HTTP  ┌──────────────────────────┐
│ index.html  │◄──────►│ server.js                │
│ + modules   │  SSE   │  ├─ lib/config.js         │
│             │◄───────│  ├─ lib/claude-data.js    │
│             │  WS    │  ├─ lib/git-service.js    │
│ xterm.js    │◄──────►│  ├─ lib/github-service.js │
│ Chart.js    │        │  ├─ lib/cost-service.js   │
└─────────────┘        │  ├─ lib/session-control.js│
                       │  └─ lib/poller.js         │
                       └──────────┬────────────────┘
                                  │
                    ┌─────────────┼──────────────┐
                    │             │              │
               ~/.claude/    git CLI      claude CLI
               (세션/비용)  (status/diff)  (AI commit)
\`\`\`

- **Frontend** — ES 모듈 (빌드 도구 없음)
- **Backend** — 순수 Node.js HTTP 서버 (프레임워크 없음)
- **실시간** — SSE로 폴링 데이터 push, WebSocket으로 터미널 스트리밍
- **터미널** — \`node-pty\`로 PTY 프로세스 생성, \`ws\`로 양방향 연결
- **AI** — \`claude -p --model haiku\` CLI 호출 (OAuth 인증)

### Tech Stack
- \`xterm.js\` (WebGL) — 터미널 렌더링
- \`Chart.js\` — 사용량 차트
- \`node-pty\` — 서버사이드 PTY
- \`ws\` — WebSocket

---

## API Endpoints

### 프로젝트
| Method | Path | 설명 |
|--------|------|------|
| GET | /api/projects | 프로젝트 목록 |
| POST | /api/projects | 프로젝트 추가 |
| PUT | /api/projects/:id | 프로젝트 수정 |
| DELETE | /api/projects/:id | 프로젝트 삭제 |

### 모니터링
| Method | Path | 설명 |
|--------|------|------|
| GET | /api/events | SSE 실시간 스트림 |
| GET | /api/projects/:id/git | Git 상태 |
| GET | /api/projects/:id/prs | PR 목록 |
| GET | /api/projects/:id/branches | 브랜치/워크트리 |
| GET | /api/usage | 사용량 요약 |
| GET | /api/cost/daily | 일별 비용 |
| GET | /api/activity | 최근 활동 |

### Git 작업
| Method | Path | 설명 |
|--------|------|------|
| GET | /api/projects/:id/diff | Staged + Unstaged diff |
| POST | /api/projects/:id/git/stage | 파일 스테이징 |
| POST | /api/projects/:id/git/unstage | 스테이징 해제 |
| POST | /api/projects/:id/git/discard | 변경사항 버리기 |
| POST | /api/projects/:id/git/commit | 수동 커밋 |
| POST | /api/projects/:id/git/checkout | 브랜치 전환 |
| POST | /api/projects/:id/git/create-branch | 새 브랜치 |
| POST | /api/projects/:id/git/delete-branch | 브랜치 삭제 |
| POST | /api/projects/:id/git/stash | 변경사항 스태시 |
| POST | /api/projects/:id/git/stash-pop | 스태시 복원 |
| GET | /api/projects/:id/stash-list | 스태시 목록 |
| POST | /api/projects/:id/push | git push |
| POST | /api/projects/:id/pull | git pull |
| POST | /api/projects/:id/fetch | git fetch --all |

### AI Auto Commit
| Method | Path | 설명 |
|--------|------|------|
| POST | /api/projects/:id/auto-commit/plan | Haiku 커밋 플랜 생성 |
| POST | /api/projects/:id/auto-commit/execute | 단일 커밋 실행 |

### Dev Server
| Method | Path | 설명 |
|--------|------|------|
| GET | /api/dev-servers | 실행 중인 서버 |
| POST | /api/projects/:id/dev-server/start | 서버 시작 |
| POST | /api/projects/:id/dev-server/stop | 서버 중지 |

---

## Setup

\`\`\`bash
cd dashboard
npm install
node server.js
\`\`\`

**요구사항:** Node.js 20+, Git, Claude Code CLI (OAuth 인증 완료)

**Windows 자동 시작:** \`powershell -File .\\setup-autostart.ps1\` (관리자 권한)
`;

function renderReadme() {
  document.getElementById('readme-content').innerHTML = simpleMarkdown(README_CONTENT);
}

// ─── All window.xxx assignments for inline onclick handlers ───
// Dashboard
window.switchView = switchView;
window.renderCard = renderCard;
window.renderAllCards = renderAllCards;
window.setChartPeriod = setChartPeriod;
window.fetchUsage = fetchUsage;
window.showConvList = showConvList;
window.closeConvList = closeConvList;
window.toggleTheme = toggleTheme;
window.togglePin = togglePin;
window.toggleNotifications = toggleNotifications;
window.toggleProjectNotif = toggleProjectNotif;
window.setProjectFilter = setProjectFilter;
window.filterProjects = filterProjects;
window.fetchAllProjects = fetchAllProjects;
window.jumpToChanges = jumpToChanges;
window.updateSummaryStats = updateSummaryStats;
window.updateScrollIndicators = updateScrollIndicators;

// Terminal
window.renderLayout = renderLayout;
window.updateTermHeaders = updateTermHeaders;
window.debouncedUpdateTermHeaders = debouncedUpdateTermHeaders;
window.closeTerminal = closeTerminal;
window.openNewTermModal = openNewTermModal;
window.createTerminal = createTerminal;
window.openTermWith = openTermWith;
window.toggleTermSearch = toggleTermSearch;
window.closeTermSearch = closeTermSearch;
window.doTermSearch = doTermSearch;
window.exportTerminal = exportTerminal;
window.changeTermFontSize = changeTermFontSize;
window.loadBranchesForTerm = loadBranchesForTerm;
window.selectBranch = selectBranch;
window.fitAllTerminals = fitAllTerminals;
window.debouncedFit = debouncedFit;

// Diff
window.renderDiffTableFull = renderDiffTableFull;
window.scrollToDiffPanel = scrollToDiffPanel;
window.debouncedLoadDiff = debouncedLoadDiff;
window.loadDiff = loadDiff;
window.diffStageFile = diffStageFile;
window.diffUnstageFile = diffUnstageFile;
window.diffDiscardFile = diffDiscardFile;
window.diffStageAll = diffStageAll;
window.diffUnstageAll = diffUnstageAll;
window.diffDiscardAll = diffDiscardAll;
window.diffExpandAll = diffExpandAll;
window.diffCollapseAll = diffCollapseAll;
window.filterDiffFiles = filterDiffFiles;
window.doManualCommit = doManualCommit;
window.generateCommitMsg = generateCommitMsg;
window.toggleBranchDropdown = toggleBranchDropdown;
window.filterBranchDropdown = filterBranchDropdown;
window.switchBranch = switchBranch;
window.toggleWorktreeDropdown = toggleWorktreeDropdown;
window.startAutoCommit = startAutoCommit;
window.cancelAutoCommit = cancelAutoCommit;
window.executeAutoCommit = executeAutoCommit;
window.doPush = doPush;
window.doPull = doPull;
window.doFetch = doFetch;
window.doStash = doStash;
window.doStashPop = doStashPop;
window.createBranch = createBranch;
window.deleteBranch = deleteBranch;

// Modals
window.openSettingsPanel = openSettingsPanel;
window.closeSettingsPanel = closeSettingsPanel;
window.openAddProjectModal = openAddProjectModal;
window.editProject = editProject;
window.saveProject = saveProject;
window.loadPkgScripts = loadPkgScripts;
window.pickScript = pickScript;
window.toggleFolderPicker = toggleFolderPicker;
window.browseTo = browseTo;
window.selectCurrentFolder = selectCurrentFolder;
window.confirmDeleteProject = confirmDeleteProject;
window.promptDevCmd = promptDevCmd;
window.setDevCmd = setDevCmd;
window.toggleDevServer = toggleDevServer;
window.showDevServerDialog = showDevServerDialog;
window.updateDevBadge = updateDevBadge;
window.openIDE = openIDE;
window.openGitHub = openGitHub;
window.openStartModal = openStartModal;
window.doStartSession = doStartSession;
window.resumeLastSession = resumeLastSession;
window.showShortcutHelp = showShortcutHelp;
window.hideShortcutHelp = hideShortcutHelp;
window.toggleCommandPalette = toggleCommandPalette;
window.closeCommandPalette = closeCommandPalette;
window.setCmdActive = setCmdActive;
window.execCmd = execCmd;
window.exportSettings = exportSettings;
window.importSettings = importSettings;
window.openDiscoverModal = openDiscoverModal;
window.toggleDiscoverItem = toggleDiscoverItem;
window.toggleDiscoverSelectAll = toggleDiscoverSelectAll;
window.addDiscoveredProjects = addDiscoveredProjects;
window.openErrorLog = openErrorLog;
window.clearErrorLog = clearErrorLog;
window.openNotifSettings = openNotifSettings;
window.renderNotifFilterList = renderNotifFilterList;
window.showGitLog = showGitLog;
window.showSessionHistory = showSessionHistory;
window.resumeSessionFromHistory = resumeSessionFromHistory;
window.openFilePreview = openFilePreview;
window.openFilePreviewFromFile = openFilePreviewFromFile;
window.closeFilePreview = closeFilePreview;
window.copyFilePathToClipboard = copyFilePathToClipboard;
window.copyFileContent = copyFileContent;
window.insertPathToTerminal = insertPathToTerminal;

// ─── Keyboard Shortcuts ───
document.addEventListener('keydown', e => {
  const mod = e.ctrlKey || e.metaKey;
  if (e.key === 'F5' || (mod && e.key === 'r')) { e.preventDefault(); location.reload(); return; }
  if (mod && e.key === '1') { e.preventDefault(); switchView('dashboard'); return; }
  if (mod && e.key === '2') { e.preventDefault(); switchView('terminal'); return; }
  if (mod && e.key === '3') { e.preventDefault(); switchView('diff'); return; }
  if (mod && e.key === '4') { e.preventDefault(); switchView('readme'); return; }
  if (mod && e.key === 'Tab') {
    if (document.getElementById('terminal-view').classList.contains('active') && app.termMap.size > 1) {
      e.preventDefault();
      const ids = [...app.termMap.keys()];
      const cur = ids.indexOf(app.activeTermId);
      const next = e.shiftKey ? (cur <= 0 ? ids.length - 1 : cur - 1) : (cur >= ids.length - 1 ? 0 : cur + 1);
      app.activeTermId = ids[next];
      updateTermHeaders();
      const t = app.termMap.get(ids[next]);
      if (t?.xterm) t.xterm.focus();
      return;
    }
  }
  if (mod && (e.key === '[' || e.key === ']')) {
    if (document.getElementById('terminal-view').classList.contains('active') && app.termMap.size > 1) {
      e.preventDefault();
      const ids = [...app.termMap.keys()];
      const cur = ids.indexOf(app.activeTermId);
      const next = e.key === '[' ? (cur <= 0 ? ids.length - 1 : cur - 1) : (cur >= ids.length - 1 ? 0 : cur + 1);
      app.activeTermId = ids[next];
      updateTermHeaders();
      const t = app.termMap.get(ids[next]);
      if (t?.xterm) t.xterm.focus();
      return;
    }
  }
  if (mod && e.key === 't' && !e.shiftKey) {
    if (document.getElementById('terminal-view').classList.contains('active')) { e.preventDefault(); openNewTermModal(); return; }
  }
  if (mod && e.key === 'w' && !e.shiftKey) {
    if (document.getElementById('terminal-view').classList.contains('active') && app.activeTermId) { e.preventDefault(); closeTerminal(app.activeTermId); return; }
  }
  if (mod && e.key === 'k') { e.preventDefault(); toggleCommandPalette(); return; }
  if (mod && e.key === 'f') {
    if (document.getElementById('terminal-view').classList.contains('active') && app.activeTermId) { e.preventDefault(); toggleTermSearch(); return; }
  }
  if (mod && e.key === 'Enter') {
    if (document.getElementById('diff-view').classList.contains('active')) {
      e.preventDefault();
      const msg = document.getElementById('diff-commit-msg')?.value?.trim();
      if (msg) doManualCommit(); else document.getElementById('diff-commit-msg')?.focus();
      return;
    }
  }
  if (e.key === 'r' && !mod && !e.altKey && !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
    if (document.getElementById('diff-view').classList.contains('active')) { e.preventDefault(); loadDiff(); return; }
  }
  if (!mod && !e.altKey && !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
    if (document.getElementById('diff-view').classList.contains('active')) {
      if (e.key === 'e') { e.preventDefault(); diffExpandAll(); return; }
      if (e.key === 'c') { e.preventDefault(); diffCollapseAll(); return; }
    }
  }
  if (e.key === '?' && !mod && !e.altKey && !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
    e.preventDefault(); showShortcutHelp(); return;
  }
  if (e.key === 'Escape') {
    const cp = document.getElementById('cmd-palette');
    if (cp && !cp.classList.contains('hidden')) { closeCommandPalette(); return; }
    const cv = document.getElementById('conv-overlay');
    if (cv && !cv.classList.contains('hidden')) { closeConvList(); return; }
    const fp = document.getElementById('file-preview-overlay');
    if (fp && !fp.classList.contains('hidden')) { closeFilePreview(); return; }
    const so = document.getElementById('shortcut-overlay');
    if (so && !so.classList.contains('hidden')) { hideShortcutHelp(); return; }
    const sb = document.getElementById('term-search-bar');
    if (sb?.classList.contains('open')) { closeTermSearch(); return; }
  }
});

// ─── OS Theme Change Listener ───
window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', e => {
  if (!app._themeManual) applyTheme(e.matches ? 'light' : 'dark');
});

// ─── Visibility Change (adaptive polling) ───
document.addEventListener('visibilitychange', onVisibilityChange);

// ─── Commit Message Persistence ───
const _commitMsgKey = 'cockpit-commit-msg';
const _commitMsgObserver = new MutationObserver(() => {
  const el = document.getElementById('commit-msg-input');
  if (el && !el.dataset.persisted) {
    el.dataset.persisted = '1';
    const saved = localStorage.getItem(_commitMsgKey);
    if (saved && !el.value) el.value = saved;
    el.addEventListener('input', () => {
      if (el.value.trim()) localStorage.setItem(_commitMsgKey, el.value);
    });
    _commitMsgObserver.disconnect();
  }
});
_commitMsgObserver.observe(document.body, { childList: true, subtree: true });

// ─── Usage Timestamp Timer ───
setInterval(updateUsageTimestamp, 15000);

// ─── Error Log Capture ───
setupErrorLogCapture();

// ─── Context Menu Listeners ───
setupCtxMenuListeners();

// ─── Init ───
async function init() {
  applyTheme(app.currentTheme);
  renderSkeletons(6);
  const res = await fetch('/api/projects');
  app.projectList = await res.json();
  if (app.pinnedProjects.size > 0) {
    app.projectList.sort((a, b) => {
      const ap = app.pinnedProjects.has(a.id) ? 0 : 1;
      const bp = app.pinnedProjects.has(b.id) ? 0 : 1;
      return ap - bp;
    });
  }
  renderAllCards(app.projectList);
  app.projectList.forEach(p => {
    app.state.projects.set(p.id, { session: p.session, git: p.git, prs: p.prs });
    renderCard(p.id);
  });
  populateProjectSelects();
  updateSummaryStats();
  try { await fetch('/api/stats').then(r => r.json()); } catch {}
  connectSSE();
  connectWS();
  startClock();
  renderReadme();
  // Scroll indicators
  const pgrid = document.getElementById('project-grid');
  if (pgrid) pgrid.addEventListener('scroll', updateScrollIndicators);
  window.addEventListener('resize', updateScrollIndicators);
  updateScrollIndicators();
  // Restore notify toggle state
  const nb = document.getElementById('notify-toggle');
  if (nb) {
    nb.textContent = app.notifyEnabled ? 'On' : 'Off';
    nb.className = 'btn' + (app.notifyEnabled ? '' : ' off-btn');
  }
  fetch('/api/notify/toggle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: app.notifyEnabled }) }).catch(() => {});
  // Restore chart period
  if (app.chartPeriod !== 30) setChartPeriod(app.chartPeriod);
  // Restore terminal font size display
  const fse = document.getElementById('term-font-size');
  if (fse) fse.textContent = app.termFontSize;
  // Restore saved view
  const savedView = localStorage.getItem('dl-view');
  if (savedView && savedView !== 'dashboard') switchView(savedView);
  // File drop
  initFileDrop();
  // Command palette listeners
  setupCommandPaletteListeners();
  // Terminal event delegation
  setupTermEventDelegation();
  // Usage polling
  app.usageTimer = setInterval(fetchUsage, 60000);
}

init();
