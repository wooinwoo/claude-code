# Changes 탭 UI/UX 대개조 플랜

## 현재 문제점
1. **구조 빈약** — 드롭다운 + Refresh 버튼 + raw diff 덤프가 전부
2. **파일 구분 없음** — diff 텍스트가 한 덩어리로 쭉 나열, 파일 경계 불명확
3. **Staged/Unstaged 구분 없음** — 둘 다 concat해서 뿌림
4. **라인넘버 없음** — 코드 리뷰 불가
5. **통계 없음** — 몇 개 파일, 몇 줄 추가/삭제인지 한눈에 안 보임
6. **파일 네비게이션 없음** — 메인 뷰에 파일 목록 없이 스크롤만 가능
7. **접기/펼치기 없음** — 파일이 많으면 끝없이 스크롤
8. **빈 상태 허접** — "No changes" 텍스트 한 줄

## 개선 레이아웃

```
┌────────────────────────────────────────────────────────────────┐
│ [Overview] [Terminal] [>Changes]                               │
├──────────────┬─────────────────────────────────────────────────┤
│  TOOLBAR     │                                                 │
│  [Project ▼] │  Summary: 5 files  +127  -34                   │
├──────────────┴─────────────────────────────────────────────────┤
│              │                                                 │
│  FILE LIST   │  ┌─ src/server.js ─────── +12 -3  ── [▼] ──┐  │
│              │  │  @@ -140,6 +140,8 @@                    │  │
│  ▾ Staged(2) │  │ 140│  const x = 1;                      │  │
│   M server.js│  │ 141│+ const y = 2;          ← 초록 하이라│  │
│   A utils.js │  │ 142│- const z = old;        ← 빨강 하이라│  │
│              │  │ 143│  return result;                     │  │
│  ▾ Unstaged  │  └──────────────────────────────────────────┘  │
│    (3)       │                                                 │
│   M index.js │  ┌─ lib/utils.js ──────── +45 -0  ── [▼] ──┐  │
│   M app.css  │  │  New file                                │  │
│   D old.js   │  │  1│+ export function ...                 │  │
│              │  └──────────────────────────────────────────┘  │
│              │                                                 │
├──────────────┴─────────────────────────────────────────────────┤
│ (빈 상태시: 일러스트 + "Working tree clean" + 마지막 커밋 표시) │
└────────────────────────────────────────────────────────────────┘
```

## 구현 단계

### 1. 서버 API 보강 (`server.js`)
- `git diff --name-status` / `git diff --cached --name-status` 추가
- `git diff --numstat` / `git diff --cached --numstat` 추가
- 응답에 `files` 배열 추가: `[{ file, status, additions, deletions }]`
- staged/unstaged 각각 파일 목록 반환

### 2. HTML 구조 교체 (`#diff-view`)
```html
<div class="view" id="diff-view">
  <!-- Top toolbar: project select + summary stats -->
  <div class="diff-toolbar">
    <select id="diff-project">...</select>
    <button class="btn" onclick="loadDiff()">↻</button>
    <div class="diff-summary" id="diff-summary"></div>
  </div>

  <div class="diff-layout">
    <!-- Left: file sidebar -->
    <aside class="diff-sidebar" id="diff-sidebar"></aside>

    <!-- Right: diff panels per file -->
    <main class="diff-main" id="diff-main"></main>
  </div>
</div>
```

### 3. CSS — 새 스타일 (~50줄)
- `.diff-toolbar` — 상단 바 (flex, 프로젝트 선택 + 통계)
- `.diff-summary` — 파일 수, +/- 카운트 뱃지
- `.diff-layout` — 2컬럼 (사이드바 220px + 메인 flex:1)
- `.diff-sidebar` — 파일 목록 (Staged/Unstaged 그룹)
- `.diff-file-item` — 파일 아이템 (상태 아이콘 A/M/D + 파일명)
- `.diff-file-item.active` — 현재 보고 있는 파일 하이라이트
- `.diff-panel` — 파일별 diff 카드 (접기/펼치기 가능)
- `.diff-panel-header` — 파일 경로 + +/- 통계 + 접기 버튼
- `.diff-gutter` — 라인넘버 거터 (old/new 2컬럼)
- `.diff-code` — 실제 코드 영역
- `.diff-empty` — 빈 상태 화면 (아이콘 + 메시지)
- Staged 섹션: 좌측 인디고 accent 바
- Unstaged 섹션: 좌측 옐로우 accent 바

### 4. JS — loadDiff() 완전 재작성
```
loadDiff() → fetch → parse response → render 3 parts:
  1. renderDiffSummary() — 상단 통계 바
  2. renderDiffSidebar() — 좌측 파일 목록 (Staged/Unstaged 그룹)
  3. renderDiffPanels() — 우측 파일별 diff 카드
```

**파일별 diff 파싱:**
- unified diff를 `diff --git` 기준으로 파일 단위 split
- 각 파일의 hunk 헤더(`@@`)에서 라인넘버 추출
- 각 줄에 old/new 라인넘버 계산

**파일 사이드바:**
- Staged / Unstaged 그룹 헤더 (접기 가능)
- 파일별: 상태 뱃지(A/M/D) + 파일명(경로 축약)
- 클릭 → 우측 패널 해당 파일로 smooth scroll

**파일 diff 패널:**
- 헤더: 전체 경로 + additions/deletions 뱃지 + 접기 토글
- 본문: 라인넘버 거터(2열) + 코드 (hunk 구분선 포함)
- 접기/펼치기 애니메이션

**빈 상태:**
- 체크마크 아이콘 + "Working tree clean" 메시지
- 마지막 커밋 해시/메시지 표시 (선택)

### 5. showDiffDialog()도 동일하게 업데이트
- 다이얼로그 내부도 새 렌더링 방식 사용 (사이드바 없이 패널만)
- 파일 칩 네비게이션 유지하되 스타일 통일

## 디자인 원칙
- 기존 대시보드 디자인 시스템(--bg, --border, --accent, --radius 등) 100% 활용
- VS Code / GitHub diff 뷰어 느낌
- 다크 테마 특화 — 코드 가독성 최우선
- 애니메이션: 접기/펼치기만 subtle하게
