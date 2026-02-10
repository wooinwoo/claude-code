<#
.SYNOPSIS
    프로젝트에 .claude 설정을 설치

.DESCRIPTION
    base/ + common/ + [stack]/ 을 프로젝트의 .claude/ 하위에 파일 복사로 설치합니다.
    모든 항목은 파일 복사이므로, 업데이트 시 setup.ps1 재실행이 필요합니다.

.EXAMPLE
    .\setup.ps1 react-next C:\my-react-project
    .\setup.ps1 nestjs C:\my-nestjs-project
#>

param(
    [Parameter(Mandatory)]
    [ValidateSet("react-next", "nestjs")]
    [string]$Stack,

    [Parameter(Mandatory)]
    [string]$ProjectPath
)

$ErrorActionPreference = "Stop"
$WiwRoot = $PSScriptRoot

# 프로젝트 경로 확인
if (-not (Test-Path $ProjectPath)) {
    Write-Error "프로젝트 경로를 찾을 수 없습니다: $ProjectPath"
    exit 1
}

$claudeDir = Join-Path $ProjectPath ".claude"

Write-Host "=== wiw_claude-code setup ===" -ForegroundColor Cyan
Write-Host "Stack:   $Stack" -ForegroundColor Gray
Write-Host "Project: $ProjectPath" -ForegroundColor Gray
Write-Host "Source:  $WiwRoot" -ForegroundColor Gray
Write-Host ""

# .claude 폴더 생성
if (-not (Test-Path $claudeDir)) {
    New-Item -ItemType Directory -Path $claudeDir | Out-Null
    Write-Host "  [NEW] .claude/ 생성" -ForegroundColor Green
}

# 스택 정보 저장 (update.ps1용)
$Stack | Out-File (Join-Path $claudeDir ".wiw-stack") -Encoding utf8 -NoNewline

# ============================================================
# 공통 복사 함수
# ============================================================
function Copy-LayerDir {
    param(
        [string]$TargetDir,
        [string]$Label,
        [string[]]$Sources,
        [switch]$Recurse,
        [switch]$CountDirs
    )

    if (-not (Test-Path $TargetDir)) {
        New-Item -ItemType Directory -Path $TargetDir | Out-Null
    }

    Write-Host ""
    Write-Host "[$Label] 복사" -ForegroundColor White
    foreach ($src in $Sources) {
        if (-not (Test-Path $src)) { continue }
        Copy-Item "$src\*" $TargetDir -Recurse -Force
        if ($CountDirs) {
            $c = (Get-ChildItem $src -Directory).Count
            $layerName = Split-Path (Split-Path $src -Parent) -Leaf
            Write-Host "  [OK] $layerName ($c items)" -ForegroundColor Green
        } else {
            $c = if ($Recurse) { (Get-ChildItem $src -Recurse -File).Count } else { (Get-ChildItem $src -File).Count }
            $layerName = Split-Path (Split-Path $src -Parent) -Leaf
            Write-Host "  [OK] $layerName ($c files)" -ForegroundColor Green
        }
    }
}

# ============================================================
# rules/ - 서브디렉토리별 복사 (base/common/stack 레이어 구분 유지)
# ============================================================
$rulesDir = Join-Path $claudeDir "rules"
if (-not (Test-Path $rulesDir)) {
    New-Item -ItemType Directory -Path $rulesDir | Out-Null
}

Write-Host "[rules/] 복사" -ForegroundColor White

$rulesSources = @(
    @{ Name = "base-common";    Path = "$WiwRoot\base\rules\common" },
    @{ Name = "base-typescript"; Path = "$WiwRoot\base\rules\typescript" },
    @{ Name = "wiw-common";     Path = "$WiwRoot\common\rules" },
    @{ Name = "wiw-stack";      Path = "$WiwRoot\$Stack\rules" }
)

foreach ($rule in $rulesSources) {
    if (-not (Test-Path $rule.Path)) { continue }
    $dest = Join-Path $rulesDir $rule.Name
    if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
    Copy-Item $rule.Path $dest -Recurse -Force
    $c = (Get-ChildItem $rule.Path -File -Recurse).Count
    Write-Host "  [OK] $($rule.Name) ($c files)" -ForegroundColor Green
}

# ============================================================
# agents/ - 파일 복사 (base + common + stack)
# ============================================================
Copy-LayerDir `
    -TargetDir (Join-Path $claudeDir "agents") `
    -Label "agents/" `
    -Sources @(
        "$WiwRoot\base\agents",
        "$WiwRoot\common\agents",
        "$WiwRoot\$Stack\agents"
    )

# ============================================================
# commands/ - 파일 복사 (base + common + stack)
# ============================================================
Copy-LayerDir `
    -TargetDir (Join-Path $claudeDir "commands") `
    -Label "commands/" `
    -Sources @(
        "$WiwRoot\base\commands",
        "$WiwRoot\common\commands",
        "$WiwRoot\$Stack\commands"
    ) -Recurse

# ============================================================
# skills/ - 파일 복사 (base + common + stack)
# ============================================================
Copy-LayerDir `
    -TargetDir (Join-Path $claudeDir "skills") `
    -Label "skills/" `
    -Sources @(
        "$WiwRoot\base\skills",
        "$WiwRoot\common\skills",
        "$WiwRoot\$Stack\skills"
    ) -CountDirs

# ============================================================
# hooks/ - 파일 복사 (base)
# ============================================================
$hooksDir = Join-Path $claudeDir "hooks"
if (Test-Path $hooksDir) {
    # 기존 junction이면 제거
    $item = Get-Item $hooksDir -Force -ErrorAction SilentlyContinue
    if ($item -and ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
        cmd /c rmdir "$hooksDir" 2>$null
    }
}
Copy-LayerDir `
    -TargetDir $hooksDir `
    -Label "hooks/" `
    -Sources @("$WiwRoot\base\hooks") -Recurse

# ============================================================
# contexts/ - 파일 복사 (base)
# ============================================================
$contextsDir = Join-Path $claudeDir "contexts"
if (Test-Path $contextsDir) {
    $item = Get-Item $contextsDir -Force -ErrorAction SilentlyContinue
    if ($item -and ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
        cmd /c rmdir "$contextsDir" 2>$null
    }
}
Copy-LayerDir `
    -TargetDir $contextsDir `
    -Label "contexts/" `
    -Sources @("$WiwRoot\base\contexts") -Recurse

# ============================================================
# scripts/ - 파일 복사 (base: hook 스크립트)
# ============================================================
$scriptsDir = Join-Path $claudeDir "scripts"
if (Test-Path $scriptsDir) {
    $item = Get-Item $scriptsDir -Force -ErrorAction SilentlyContinue
    if ($item -and ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
        cmd /c rmdir "$scriptsDir" 2>$null
    }
}
Copy-LayerDir `
    -TargetDir $scriptsDir `
    -Label "scripts/" `
    -Sources @("$WiwRoot\base\scripts") -Recurse

# ============================================================
# scripts-wiw/ - 파일 복사 (common: MCP 래퍼 스크립트)
# ============================================================
$scriptsWiwDir = Join-Path $claudeDir "scripts-wiw"
if (Test-Path $scriptsWiwDir) {
    $item = Get-Item $scriptsWiwDir -Force -ErrorAction SilentlyContinue
    if ($item -and ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
        cmd /c rmdir "$scriptsWiwDir" 2>$null
    }
}
Copy-LayerDir `
    -TargetDir $scriptsWiwDir `
    -Label "scripts-wiw/" `
    -Sources @("$WiwRoot\common\scripts") -Recurse

# ============================================================
# settings.json — 권한 설정 (없을 때만)
# ============================================================
Write-Host ""
Write-Host "[settings] 권한 설정" -ForegroundColor White
$settingsJson = Join-Path $claudeDir "settings.json"
$settingsTemplate = Join-Path $WiwRoot "common\settings.json"
if (-not (Test-Path $settingsJson) -and (Test-Path $settingsTemplate)) {
    Copy-Item $settingsTemplate $settingsJson
    Write-Host "  [NEW] settings.json 생성 (Bash 권한 사전 허용)" -ForegroundColor Yellow
} else {
    Write-Host "  [SKIP] settings.json 이미 존재" -ForegroundColor Gray
}

# ============================================================
# .mcp.json 복사 (없을 때만)
# ============================================================
Write-Host ""
Write-Host "[MCP] 설정" -ForegroundColor White
$mcpJson = Join-Path $ProjectPath ".mcp.json"
$mcpTemplate = Join-Path $WiwRoot "common\mcp-configs\.mcp.json"
if (-not (Test-Path $mcpJson) -and (Test-Path $mcpTemplate)) {
    Copy-Item $mcpTemplate $mcpJson
    Write-Host "  [NEW] .mcp.json 생성 (필요 없는 서버는 제거하세요)" -ForegroundColor Yellow
} else {
    Write-Host "  [SKIP] .mcp.json 이미 존재" -ForegroundColor Gray
}

# .env 파일 안내 (.env.example 복사)
$envFile = Join-Path $claudeDir ".env"
$envExample = Join-Path $WiwRoot "common\.env.example"
if (-not (Test-Path $envFile) -and (Test-Path $envExample)) {
    Copy-Item $envExample $envFile
    Write-Host "  [NEW] .claude/.env 생성 (토큰을 직접 입력하세요)" -ForegroundColor Yellow
} elseif (Test-Path $envFile) {
    # 기존 .env에 CLAUDE_PLUGIN_ROOT 없으면 추가
    $envContent = Get-Content $envFile -Raw
    if ($envContent -notmatch "CLAUDE_PLUGIN_ROOT") {
        Add-Content $envFile "`n# hooks/scripts 경로 (변경하지 마세요)`nCLAUDE_PLUGIN_ROOT=.claude"
        Write-Host "  [OK] .env에 CLAUDE_PLUGIN_ROOT 추가" -ForegroundColor Green
    }
}

# ============================================================
# homunculus 디렉토리 초기화 (continuous-learning-v2)
# ============================================================
$homunculusDir = Join-Path $claudeDir "homunculus"
if (-not (Test-Path $homunculusDir)) {
    New-Item -ItemType Directory -Path "$homunculusDir\instincts\personal" -Force | Out-Null
    New-Item -ItemType Directory -Path "$homunculusDir\instincts\inherited" -Force | Out-Null
    New-Item -ItemType Directory -Path "$homunculusDir\evolved\agents" -Force | Out-Null
    New-Item -ItemType Directory -Path "$homunculusDir\evolved\skills" -Force | Out-Null
    New-Item -ItemType Directory -Path "$homunculusDir\evolved\commands" -Force | Out-Null
    New-Item -ItemType File -Path "$homunculusDir\observations.jsonl" -Force | Out-Null
    Write-Host ""
    Write-Host "  [NEW] homunculus/ 디렉토리 생성 (학습 시스템)" -ForegroundColor Green
}

# ============================================================
# CLAUDE.md 생성 (없을 때만)
# ============================================================
$claudeMd = Join-Path $ProjectPath "CLAUDE.md"
if (-not (Test-Path $claudeMd)) {
    $projectName = Split-Path $ProjectPath -Leaf
    @"
# $projectName

## Project Overview

<!-- 프로젝트 설명을 여기에 작성하세요 -->

## When writing code (IMPORTANT)

- Do not use abstract words for all function names, variable names (e.g. Info, Data, Item, Manager, Handler, Process, Helper, Util)
- Use specific, descriptive names that convey intent

## Setup

- wiw_claude-code: $Stack
- template version: $(Get-Content "$WiwRoot\VERSION" -ErrorAction SilentlyContinue)
"@ | Out-File $claudeMd -Encoding utf8
    Write-Host ""
    Write-Host "  [NEW] CLAUDE.md 생성 (직접 수정하세요)" -ForegroundColor Green
}

# ============================================================
# .gitignore 에 관리 항목 추가
# ============================================================
$gitignore = Join-Path $ProjectPath ".gitignore"
$ignoreEntries = @(
    "# wiw_claude-code (setup.ps1로 관리)"
    ".claude/.env"
    ".claude/.wiw-stack"
    ".claude/settings.local.json"
    ".claude/homunculus/"
    "CLAUDE.local.md"
    ".orchestrate/"
    "worktrees/"
    "plans/"
)

if (Test-Path $gitignore) {
    $existing = Get-Content $gitignore -Raw
    if ($existing -notmatch "wiw_claude-code") {
        $ignoreEntries -join "`n" | Add-Content $gitignore
        Write-Host ""
        Write-Host "  [OK] .gitignore 업데이트" -ForegroundColor Green
    }
} else {
    $ignoreEntries -join "`n" | Out-File $gitignore -Encoding utf8
    Write-Host ""
    Write-Host "  [NEW] .gitignore 생성" -ForegroundColor Green
}

# ============================================================
# 완료
# ============================================================
Write-Host ""
Write-Host "=== setup 완료 ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "설치 내역 (모두 파일 복사):" -ForegroundColor White
Write-Host "  rules/        base + wiw-common + wiw-$Stack" -ForegroundColor Gray
Write-Host "  agents/       base + common + $Stack" -ForegroundColor Gray
Write-Host "  commands/     base + common + $Stack" -ForegroundColor Gray
Write-Host "  skills/       base + common + $Stack" -ForegroundColor Gray
Write-Host "  hooks/        base" -ForegroundColor Gray
Write-Host "  scripts/      base (hook 스크립트)" -ForegroundColor Gray
Write-Host "  scripts-wiw/  common (MCP 래퍼)" -ForegroundColor Gray
Write-Host "  .mcp.json     MCP 서버 설정" -ForegroundColor Gray
Write-Host ""
Write-Host "다음 단계:" -ForegroundColor White
Write-Host "  1. CLAUDE.md에 프로젝트 설명 작성" -ForegroundColor Gray
Write-Host "  2. .claude/rules/project.md 에 프로젝트 전용 규칙 추가 (선택)" -ForegroundColor Gray
Write-Host "  3. .claude/.env 에 토큰 입력 (GitHub PAT, Jira Token, DATABASE_URL)" -ForegroundColor Gray
Write-Host "  4. .mcp.json 에서 필요 없는 MCP 서버 제거" -ForegroundColor Gray
Write-Host ""
Write-Host "wiw_claude-code 업데이트 후 setup.ps1 재실행하면 반영됩니다." -ForegroundColor DarkGray
