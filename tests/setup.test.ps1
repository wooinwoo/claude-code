<#
.SYNOPSIS
    setup.ps1 설치 검증 테스트

.DESCRIPTION
    NestJS, React 두 스택 모두 설치하고 결과를 검증합니다.
    - 디렉토리/파일 존재 여부
    - 파일 복사 확인
    - 파일 수 검증
    - 멱등성 (재실행 안전성)
    - .gitignore / CLAUDE.md / .mcp.json / .env 생성

.EXAMPLE
    .\tests\setup.test.ps1
#>

$ErrorActionPreference = "Stop"
$WiwRoot = Split-Path $PSScriptRoot -Parent
$TestRoot = Join-Path $env:TEMP "wiw-test-$(Get-Random)"

$pass = 0
$fail = 0
$errors = @()

function Assert($condition, $name) {
    if ($condition) {
        Write-Host "  [PASS] $name" -ForegroundColor Green
        $script:pass++
    } else {
        Write-Host "  [FAIL] $name" -ForegroundColor Red
        $script:fail++
        $script:errors += $name
    }
}

function Count-Files($path) {
    if (Test-Path $path) {
        return (Get-ChildItem $path -File -Recurse).Count
    }
    return 0
}

function Count-Dirs($path) {
    if (Test-Path $path) {
        return (Get-ChildItem $path -Directory).Count
    }
    return 0
}

# ============================================================
Write-Host ""
Write-Host "=== wiw_claude-code setup.ps1 test ===" -ForegroundColor Cyan
Write-Host "Source:  $WiwRoot" -ForegroundColor Gray
Write-Host "TempDir: $TestRoot" -ForegroundColor Gray
Write-Host ""

# ============================================================
# 1. 소스 구조 검증
# ============================================================
Write-Host "[1/6] source structure" -ForegroundColor White

Assert (Test-Path "$WiwRoot\base\agents")       "base/agents"
Assert (Test-Path "$WiwRoot\base\commands")      "base/commands"
Assert (Test-Path "$WiwRoot\base\skills")        "base/skills"
Assert (Test-Path "$WiwRoot\base\rules\common")  "base/rules/common"
Assert (Test-Path "$WiwRoot\base\hooks")         "base/hooks"
Assert (Test-Path "$WiwRoot\common\agents")      "common/agents"
Assert (Test-Path "$WiwRoot\common\commands")    "common/commands"
Assert (Test-Path "$WiwRoot\common\rules")       "common/rules"
Assert (Test-Path "$WiwRoot\common\scripts")     "common/scripts"
Assert (Test-Path "$WiwRoot\common\mcp-configs\.mcp.json") "common/mcp-configs/.mcp.json"
Assert (Test-Path "$WiwRoot\common\.env.example") ".env.example"
Assert (Test-Path "$WiwRoot\react-next\agents")  "react-next/agents"
Assert (Test-Path "$WiwRoot\react-next\commands") "react-next/commands"
Assert (Test-Path "$WiwRoot\react-next\rules")   "react-next/rules"
Assert (Test-Path "$WiwRoot\react-next\skills")  "react-next/skills"
Assert (Test-Path "$WiwRoot\nestjs\agents")      "nestjs/agents"
Assert (Test-Path "$WiwRoot\nestjs\commands")    "nestjs/commands"
Assert (Test-Path "$WiwRoot\nestjs\rules")       "nestjs/rules"

# ============================================================
# 2-3. 스택별 설치 테스트
# ============================================================
foreach ($Stack in @("react-next", "nestjs")) {
    $projectDir = Join-Path $TestRoot $Stack
    New-Item -ItemType Directory -Path $projectDir -Force | Out-Null

    $phase = if ($Stack -eq "react-next") { "2/6" } else { "3/6" }
    Write-Host ""
    Write-Host "[$phase] $Stack install" -ForegroundColor White

    & "$WiwRoot\setup.ps1" $Stack $projectDir 2>&1 | Out-Null

    $claudeDir = Join-Path $projectDir ".claude"

    # --- 기본 구조 ---
    Assert (Test-Path $claudeDir)                           "$Stack .claude/ created"
    Assert (Test-Path "$claudeDir\.wiw-stack")              "$Stack .wiw-stack created"
    $stackContent = (Get-Content "$claudeDir\.wiw-stack" -Raw).Trim()
    Assert ($stackContent -eq $Stack)                       "$Stack .wiw-stack content correct"

    # --- Rules (복사) ---
    Assert (Test-Path "$claudeDir\rules\base-common")       "$Stack rules/base-common exists"
    Assert (Test-Path "$claudeDir\rules\base-typescript")    "$Stack rules/base-typescript exists"
    Assert (Test-Path "$claudeDir\rules\wiw-common")         "$Stack rules/wiw-common exists"
    Assert (Test-Path "$claudeDir\rules\wiw-stack")          "$Stack rules/wiw-stack exists"

    $stackRuleCount = Count-Files "$claudeDir\rules\wiw-stack"
    if ($Stack -eq "react-next") {
        Assert ($stackRuleCount -ge 4)  "$Stack stack rules: $stackRuleCount (min 4)"
    } else {
        Assert ($stackRuleCount -ge 2)  "$Stack stack rules: $stackRuleCount (min 2)"
    }

    # --- Agents (복사) ---
    $agentCount = Count-Files "$claudeDir\agents"
    if ($Stack -eq "react-next") {
        Assert ($agentCount -ge 14)     "$Stack agents: $agentCount (min 14)"
    } else {
        Assert ($agentCount -ge 12)     "$Stack agents: $agentCount (min 12)"
    }

    # --- Commands (복사) ---
    $cmdCount = Count-Files "$claudeDir\commands"
    if ($Stack -eq "react-next") {
        Assert ($cmdCount -ge 6)        "$Stack commands: $cmdCount (min 6)"
    } else {
        Assert ($cmdCount -ge 7)        "$Stack commands: $cmdCount (min 7)"
    }

    # --- Skills (복사) ---
    $skillCount = Count-Dirs "$claudeDir\skills"
    if ($Stack -eq "react-next") {
        Assert ($skillCount -ge 10)     "$Stack skills: $skillCount (min 10)"
    } else {
        Assert ($skillCount -ge 7)      "$Stack skills: $skillCount (min 7)"
    }

    # --- hooks/contexts/scripts/scripts-wiw (복사) ---
    Assert (Test-Path "$claudeDir\hooks\hooks.json")   "$Stack hooks/hooks.json copied"
    Assert (Test-Path "$claudeDir\scripts\hooks")      "$Stack scripts/hooks/ copied"
    Assert (Test-Path "$claudeDir\scripts\lib")        "$Stack scripts/lib/ copied"
    $scriptWiwCount = Count-Files "$claudeDir\scripts-wiw"
    Assert ($scriptWiwCount -ge 3)                     "$Stack scripts-wiw: $scriptWiwCount (min 3)"

    # --- .mcp.json ---
    $mcpJson = Join-Path $projectDir ".mcp.json"
    Assert (Test-Path $mcpJson)       "$Stack .mcp.json created"
    $mcpContent = Get-Content $mcpJson -Raw | ConvertFrom-Json
    Assert ($null -ne $mcpContent.mcpServers.mysql) "$Stack .mcp.json has mysql"
    Assert ($null -ne $mcpContent.mcpServers.github)   "$Stack .mcp.json has github"

    # --- .env ---
    $envFile = Join-Path $claudeDir ".env"
    Assert (Test-Path $envFile)                    "$Stack .env created"
    $envContent = Get-Content $envFile -Raw
    Assert ($envContent -match "GITHUB_PAT")              "$Stack .env has GITHUB_PAT"
    Assert ($envContent -match "DATABASE_URL")            "$Stack .env has DATABASE_URL"
    Assert ($envContent -match "CLAUDE_PLUGIN_ROOT")      "$Stack .env has CLAUDE_PLUGIN_ROOT"

    # --- CLAUDE.md ---
    $claudeMd = Join-Path $projectDir "CLAUDE.md"
    Assert (Test-Path $claudeMd)                   "$Stack CLAUDE.md created"
    $mdContent = Get-Content $claudeMd -Raw
    Assert ($mdContent -match $Stack)              "$Stack CLAUDE.md has stack name"

    # --- .gitignore ---
    $gitignore = Join-Path $projectDir ".gitignore"
    Assert (Test-Path $gitignore)                  "$Stack .gitignore created"
    $giContent = Get-Content $gitignore -Raw
    Assert ($giContent -match "wiw_claude-code")   "$Stack .gitignore has marker"
    Assert ($giContent -match "\.claude/\.env")    "$Stack .gitignore has .env"
}

# ============================================================
# 4. 멱등성 테스트
# ============================================================
Write-Host ""
Write-Host "[4/6] idempotency (re-run react-next)" -ForegroundColor White

$reactDir = Join-Path $TestRoot "react-next"

# 커스텀 내용 추가
$mcpPath = Join-Path $reactDir ".mcp.json"
$mcpObj = Get-Content $mcpPath -Raw | ConvertFrom-Json
$mcpObj.mcpServers | Add-Member -NotePropertyName "custom-server" -NotePropertyValue @{ command = "echo"; args = @("test") } -Force
$mcpObj | ConvertTo-Json -Depth 5 | Out-File $mcpPath -Encoding utf8

$envPath = Join-Path $reactDir ".claude\.env"
Add-Content $envPath "`nCUSTOM_TOKEN=abc123"

$mdPath = Join-Path $reactDir "CLAUDE.md"
Add-Content $mdPath "`n## Custom Section"

# 재실행
& "$WiwRoot\setup.ps1" "react-next" $reactDir 2>&1 | Out-Null

# 기존 파일 보존 확인
$mcpAfter = Get-Content $mcpPath -Raw | ConvertFrom-Json
Assert ($null -ne $mcpAfter.mcpServers."custom-server") "idempotent: .mcp.json custom server preserved"

$envAfter = Get-Content $envPath -Raw
Assert ($envAfter -match "CUSTOM_TOKEN")                "idempotent: .env custom token preserved"
Assert ($envAfter -match "CLAUDE_PLUGIN_ROOT")          "idempotent: .env CLAUDE_PLUGIN_ROOT preserved"

$mdAfter = Get-Content $mdPath -Raw
Assert ($mdAfter -match "Custom Section")               "idempotent: CLAUDE.md custom content preserved"

# .gitignore 중복 안 됨
$giAfter = Get-Content (Join-Path $reactDir ".gitignore") -Raw
$markerCount = ([regex]::Matches($giAfter, "wiw_claude-code")).Count
Assert ($markerCount -eq 1)                             "idempotent: .gitignore no duplicates ($markerCount)"

# 파일 복사는 갱신됨
$agentAfter = Count-Files (Join-Path $reactDir ".claude\agents")
Assert ($agentAfter -ge 14)                             "idempotent: agents refreshed ($agentAfter)"

# ============================================================
# 5. update.ps1 테스트
# ============================================================
Write-Host ""
Write-Host "[5/6] update.ps1" -ForegroundColor White

$nestDir = Join-Path $TestRoot "nestjs"
& "$WiwRoot\update.ps1" $nestDir 2>&1 | Out-Null

$agentAfterUpdate = Count-Files (Join-Path $nestDir ".claude\agents")
Assert ($agentAfterUpdate -ge 12)                       "update: nestjs agents refreshed ($agentAfterUpdate)"

$stackAfterUpdate = (Get-Content (Join-Path $nestDir ".claude\.wiw-stack") -Raw).Trim()
Assert ($stackAfterUpdate -eq "nestjs")                 "update: .wiw-stack preserved"

# ============================================================
# 6. 커맨드 중복 검증
# ============================================================
Write-Host ""
Write-Host "[6/6] command dedup check" -ForegroundColor White

foreach ($Stack in @("react-next", "nestjs")) {
    $dir = Join-Path $TestRoot "$Stack\.claude\commands"
    $files = Get-ChildItem $dir -File | Select-Object -ExpandProperty Name
    $dupes = $files | Group-Object | Where-Object { $_.Count -gt 1 }
    Assert ($dupes.Count -eq 0)                         "$Stack no duplicate commands"
}

# ============================================================
# 정리 및 결과
# ============================================================
Write-Host ""
Remove-Item $TestRoot -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "=== RESULT ===" -ForegroundColor Cyan
Write-Host "  PASS: $pass" -ForegroundColor Green
$failColor = if ($fail -gt 0) { "Red" } else { "Gray" }
Write-Host "  FAIL: $fail" -ForegroundColor $failColor

if ($errors.Count -gt 0) {
    Write-Host ""
    Write-Host "FAILURES:" -ForegroundColor Red
    $errors | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
}

Write-Host ""
exit $fail
