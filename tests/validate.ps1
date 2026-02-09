<#
.SYNOPSIS
    wiw_claude-code 콘텐츠 검증

.DESCRIPTION
    모든 레이어(base, common, react-next, nestjs)의 콘텐츠를 검증합니다.
    - agents: frontmatter (description, tools)
    - commands: 비어있지 않은지
    - hooks: hooks.json 스키마 + 스크립트 참조
    - rules: 비어있지 않은지 (재귀)
    - skills: SKILL.md 존재 + 비어있지 않은지

.EXAMPLE
    .\tests\validate.ps1
#>

$ErrorActionPreference = "Stop"
$TestRoot = Split-Path $PSScriptRoot -Parent
$CiDir = Join-Path $TestRoot "scripts\ci"

$pass = 0
$fail = 0

Write-Host ""
Write-Host "=== wiw_claude-code validate ===" -ForegroundColor Cyan
Write-Host "Source: $TestRoot" -ForegroundColor Gray
Write-Host ""

$validators = @(
    "validate-agents.js",
    "validate-commands.js",
    "validate-hooks.js",
    "validate-rules.js",
    "validate-skills.js",
    "validate-relations.js"
)

foreach ($v in $validators) {
    $script = Join-Path $CiDir $v
    if (-not (Test-Path $script)) {
        Write-Host "  [SKIP] $v (not found)" -ForegroundColor Yellow
        continue
    }

    $output = & node $script 2>&1
    $exitCode = $LASTEXITCODE

    foreach ($line in $output) {
        Write-Host $line
    }

    if ($exitCode -eq 0) {
        $pass++
    } else {
        $fail++
    }
}

Write-Host ""
Write-Host "=== RESULT ===" -ForegroundColor Cyan
Write-Host "  PASS: $pass" -ForegroundColor Green
$failColor = if ($fail -gt 0) { "Red" } else { "Gray" }
Write-Host "  FAIL: $fail" -ForegroundColor $failColor
Write-Host ""

exit $fail
