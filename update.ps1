<#
.SYNOPSIS
    설치된 프로젝트의 agents/commands/skills 갱신

.DESCRIPTION
    setup.ps1로 설치된 프로젝트를 다시 갱신합니다.
    .claude/.wiw-stack 파일에서 스택 정보를 자동으로 읽습니다.

.EXAMPLE
    .\update.ps1 C:\my-react-project
    .\update.ps1 C:\project1, C:\project2
#>

param(
    [Parameter(Mandatory, ValueFromRemainingArguments)]
    [string[]]$ProjectPaths
)

$ErrorActionPreference = "Stop"
$WiwRoot = $PSScriptRoot

foreach ($ProjectPath in $ProjectPaths) {
    $stackFile = Join-Path $ProjectPath ".claude\.wiw-stack"

    if (-not (Test-Path $stackFile)) {
        Write-Host "[SKIP] $ProjectPath (.wiw-stack not found)" -ForegroundColor Yellow
        continue
    }

    $Stack = (Get-Content $stackFile -Raw).Trim()
    Write-Host "[$ProjectPath] stack=$Stack" -ForegroundColor Cyan
    & "$WiwRoot\setup.ps1" $Stack $ProjectPath
    Write-Host ""
}
