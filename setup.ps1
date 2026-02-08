<#
.SYNOPSIS
    프로젝트에 .claude 설정을 설치

.DESCRIPTION
    base/ + common/ + [stack]/ 을 프로젝트의 .claude/ 하위에 설치합니다.
    - rules/          junction (자동 반영)
    - agents/commands/skills/  파일 복사 (업데이트 시 재실행 필요)
    - hooks/contexts/scripts/  junction (자동 반영)

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
# rules/ - 하위 디렉토리 junction (자동 로딩 지원)
# ============================================================
$rulesDir = Join-Path $claudeDir "rules"
if (-not (Test-Path $rulesDir)) {
    New-Item -ItemType Directory -Path $rulesDir | Out-Null
}

function New-JunctionSafe {
    param([string]$Link, [string]$Target)

    if (-not (Test-Path $Target)) {
        Write-Host "  [SKIP] $Target (not found)" -ForegroundColor Yellow
        return
    }
    if (Test-Path $Link) {
        # 기존 junction 제거
        cmd /c rmdir "$Link" 2>$null
        Remove-Item $Link -Force -ErrorAction SilentlyContinue
    }
    cmd /c mklink /J "$Link" "$Target" | Out-Null
    Write-Host "  [OK] $Link -> $Target" -ForegroundColor Green
}

Write-Host "[rules/] junction 생성" -ForegroundColor White
New-JunctionSafe "$rulesDir\base-common"     "$WiwRoot\base\rules\common"
New-JunctionSafe "$rulesDir\base-typescript"  "$WiwRoot\base\rules\typescript"
New-JunctionSafe "$rulesDir\wiw-common"       "$WiwRoot\common\rules"
New-JunctionSafe "$rulesDir\wiw-stack"        "$WiwRoot\$Stack\rules"

# ============================================================
# agents/ - 파일 복사 (base + stack, 프로젝트 로컬 파일 보존)
# ============================================================
$agentsDir = Join-Path $claudeDir "agents"
if (-not (Test-Path $agentsDir)) {
    New-Item -ItemType Directory -Path $agentsDir | Out-Null
}

Write-Host ""
Write-Host "[agents/] 복사" -ForegroundColor White
$baseAgents = Join-Path $WiwRoot "base\agents"
if (Test-Path $baseAgents) {
    Copy-Item "$baseAgents\*" $agentsDir -Recurse -Force
    $c = (Get-ChildItem $baseAgents -File).Count
    Write-Host "  [OK] base ($c files)" -ForegroundColor Green
}
$stackAgents = Join-Path $WiwRoot "$Stack\agents"
if (Test-Path $stackAgents) {
    Copy-Item "$stackAgents\*" $agentsDir -Recurse -Force
    $c = (Get-ChildItem $stackAgents -File).Count
    Write-Host "  [OK] $Stack ($c files)" -ForegroundColor Green
}

# ============================================================
# commands/ - 파일 복사 (base + common + stack, 프로젝트 로컬 파일 보존)
# ============================================================
$commandsDir = Join-Path $claudeDir "commands"
if (-not (Test-Path $commandsDir)) {
    New-Item -ItemType Directory -Path $commandsDir | Out-Null
}

Write-Host ""
Write-Host "[commands/] 복사" -ForegroundColor White
$baseCmds = Join-Path $WiwRoot "base\commands"
if (Test-Path $baseCmds) {
    Copy-Item "$baseCmds\*" $commandsDir -Recurse -Force
    $c = (Get-ChildItem $baseCmds -File).Count
    Write-Host "  [OK] base ($c files)" -ForegroundColor Green
}
$commonCmds = Join-Path $WiwRoot "common\commands"
if (Test-Path $commonCmds) {
    Copy-Item "$commonCmds\*" $commandsDir -Recurse -Force
    $c = (Get-ChildItem $commonCmds -Recurse -File).Count
    Write-Host "  [OK] common ($c files)" -ForegroundColor Green
}
$stackCmds = Join-Path $WiwRoot "$Stack\commands"
if (Test-Path $stackCmds) {
    Copy-Item "$stackCmds\*" $commandsDir -Recurse -Force
    $c = (Get-ChildItem $stackCmds -Recurse -File).Count
    Write-Host "  [OK] $Stack ($c files)" -ForegroundColor Green
}

# ============================================================
# skills/ - 파일 복사 (base + stack, 프로젝트 로컬 파일 보존)
# ============================================================
$skillsDir = Join-Path $claudeDir "skills"
if (-not (Test-Path $skillsDir)) {
    New-Item -ItemType Directory -Path $skillsDir | Out-Null
}

Write-Host ""
Write-Host "[skills/] 복사" -ForegroundColor White
$baseSkills = Join-Path $WiwRoot "base\skills"
if (Test-Path $baseSkills) {
    Copy-Item "$baseSkills\*" $skillsDir -Recurse -Force
    $c = (Get-ChildItem $baseSkills -Directory).Count
    Write-Host "  [OK] base ($c skills)" -ForegroundColor Green
}
$stackSkills = Join-Path $WiwRoot "$Stack\skills"
if (Test-Path $stackSkills) {
    Copy-Item "$stackSkills\*" $skillsDir -Recurse -Force
    $c = (Get-ChildItem $stackSkills -Directory).Count
    Write-Host "  [OK] $Stack ($c skills)" -ForegroundColor Green
}

# ============================================================
# hooks/, contexts/, scripts/ - base 그대로
# ============================================================
Write-Host ""
Write-Host "[기타] junction 생성" -ForegroundColor White
New-JunctionSafe "$claudeDir\hooks"            "$WiwRoot\base\hooks"
New-JunctionSafe "$claudeDir\contexts"         "$WiwRoot\base\contexts"
New-JunctionSafe "$claudeDir\scripts"          "$WiwRoot\base\scripts"

# ============================================================
# MCP 관련 - scripts-wiw(MCP 래퍼), mcp-configs(서버 설정 템플릿)
# ============================================================
Write-Host ""
Write-Host "[MCP] junction 생성" -ForegroundColor White
New-JunctionSafe "$claudeDir\scripts-wiw"      "$WiwRoot\common\scripts"
New-JunctionSafe "$claudeDir\mcp-configs"      "$WiwRoot\common\mcp-configs"

# .env 파일 안내 (.env.example 복사)
$envFile = Join-Path $claudeDir ".env"
$envExample = Join-Path $WiwRoot "common\.env.example"
if (-not (Test-Path $envFile) -and (Test-Path $envExample)) {
    Copy-Item $envExample $envFile
    Write-Host "  [NEW] .claude/.env 생성 (토큰을 직접 입력하세요)" -ForegroundColor Yellow
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
# .gitignore 에 junction 경로 추가
# ============================================================
$gitignore = Join-Path $ProjectPath ".gitignore"
$junctionEntries = @(
    "# wiw_claude-code (setup.ps1로 관리)"
    ".claude/rules/base-*"
    ".claude/rules/wiw-*"
    ".claude/hooks"
    ".claude/contexts"
    ".claude/scripts"
    ".claude/scripts-wiw"
    ".claude/mcp-configs"
    ".claude/.env"
    ".claude/.wiw-stack"
)

if (Test-Path $gitignore) {
    $existing = Get-Content $gitignore -Raw
    if ($existing -notmatch "wiw_claude-code junctions") {
        $junctionEntries -join "`n" | Add-Content $gitignore
        Write-Host ""
        Write-Host "  [OK] .gitignore 업데이트" -ForegroundColor Green
    }
} else {
    $junctionEntries -join "`n" | Out-File $gitignore -Encoding utf8
    Write-Host ""
    Write-Host "  [NEW] .gitignore 생성" -ForegroundColor Green
}

# ============================================================
# 완료
# ============================================================
Write-Host ""
Write-Host "=== setup 완료 ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "설치 내역:" -ForegroundColor White
Write-Host "  rules/        junction (base + wiw-common + wiw-$Stack)" -ForegroundColor Gray
Write-Host "  agents/       복사 (base + $Stack)" -ForegroundColor Gray
Write-Host "  commands/     복사 (base + common + $Stack)" -ForegroundColor Gray
Write-Host "  skills/       복사 (base + $Stack)" -ForegroundColor Gray
Write-Host "  hooks/        junction (base)" -ForegroundColor Gray
Write-Host "  contexts/     junction (base)" -ForegroundColor Gray
Write-Host "  scripts-wiw/  junction (MCP 래퍼)" -ForegroundColor Gray
Write-Host "  mcp-configs/  junction (MCP 설정)" -ForegroundColor Gray
Write-Host ""
Write-Host "다음 단계:" -ForegroundColor White
Write-Host "  1. CLAUDE.md에 프로젝트 설명 작성" -ForegroundColor Gray
Write-Host "  2. .claude/rules/project.md 에 프로젝트 전용 규칙 추가 (선택)" -ForegroundColor Gray
Write-Host "  3. .claude/.env 에 토큰 입력 (GitHub PAT, Jira Token)" -ForegroundColor Gray
Write-Host "  4. mcp-configs -> settings.local.json 복사" -ForegroundColor Gray
Write-Host ""
Write-Host "wiw_claude-code 업데이트 후 setup.ps1 재실행하면 반영됩니다." -ForegroundColor DarkGray
