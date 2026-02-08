<#
.SYNOPSIS
    ECC(everything-claude-code) 최신 내용을 base/에 동기화

.DESCRIPTION
    ECC 레포를 git pull 한 후 이 스크립트를 실행하면
    base/ 폴더가 ECC 최신 상태로 갱신됩니다.
    common/, react-next/, nestjs/ 폴더는 건드리지 않습니다.

.EXAMPLE
    .\sync.ps1
    .\sync.ps1 -EccPath "D:\other\path\everything-claude-code"
#>

param(
    [string]$EccPath = "C:\_project\template\everything-claude-code"
)

$ErrorActionPreference = "Stop"
$WiwRoot = $PSScriptRoot

# ECC 경로 확인
if (-not (Test-Path $EccPath)) {
    Write-Error "ECC 경로를 찾을 수 없습니다: $EccPath"
    exit 1
}

Write-Host "=== ECC -> wiw_claude-code/base/ sync ===" -ForegroundColor Cyan
Write-Host "Source: $EccPath" -ForegroundColor Gray
Write-Host "Target: $WiwRoot\base\" -ForegroundColor Gray
Write-Host ""

# 동기화 대상 폴더
$syncDirs = @("agents", "commands", "rules", "skills", "hooks", "contexts")

foreach ($dir in $syncDirs) {
    $src = Join-Path $EccPath $dir
    $dst = Join-Path $WiwRoot "base\$dir"

    if (Test-Path $src) {
        # 기존 폴더 삭제 후 복사 (깨끗한 동기화)
        if (Test-Path $dst) {
            Remove-Item $dst -Recurse -Force
        }
        Copy-Item $src $dst -Recurse
        $count = (Get-ChildItem $dst -Recurse -File).Count
        Write-Host "  [OK] $dir/ ($count files)" -ForegroundColor Green
    } else {
        Write-Host "  [SKIP] $dir/ (not found in ECC)" -ForegroundColor Yellow
    }
}

# scripts/hooks, scripts/lib 동기화
$scriptDirs = @("hooks", "lib")
foreach ($dir in $scriptDirs) {
    $src = Join-Path $EccPath "scripts\$dir"
    $dst = Join-Path $WiwRoot "base\scripts\$dir"

    if (Test-Path $src) {
        if (Test-Path $dst) {
            Remove-Item $dst -Recurse -Force
        }
        New-Item -ItemType Directory -Path (Split-Path $dst) -Force | Out-Null
        Copy-Item $src $dst -Recurse
        $count = (Get-ChildItem $dst -Recurse -File).Count
        Write-Host "  [OK] scripts/$dir/ ($count files)" -ForegroundColor Green
    }
}

# ============================================================
# exclude.json 기반으로 불필요 항목 → base/_excluded/ 이동
# ============================================================
$excludeFile = Join-Path $WiwRoot "exclude.json"
if (Test-Path $excludeFile) {
    $exclude = Get-Content $excludeFile -Raw | ConvertFrom-Json
    $excludedDir = Join-Path $WiwRoot "base\_excluded"
    $excludedCount = 0

    # _excluded/ 초기화
    if (Test-Path $excludedDir) {
        Remove-Item $excludedDir -Recurse -Force
    }

    # rules: 폴더 단위 (예: golang/, python/)
    foreach ($rule in $exclude.rules) {
        $src = Join-Path $WiwRoot "base\rules\$rule"
        if (Test-Path $src) {
            $dst = Join-Path $excludedDir "rules\$rule"
            New-Item -ItemType Directory -Path (Split-Path $dst) -Force | Out-Null
            Move-Item $src $dst
            $excludedCount++
        }
    }

    # agents, commands: 파일 단위 (예: go-reviewer.md)
    foreach ($category in @("agents", "commands")) {
        $items = $exclude.$category
        if ($items) {
            foreach ($item in $items) {
                $src = Join-Path $WiwRoot "base\$category\$item"
                if (Test-Path $src) {
                    $dst = Join-Path $excludedDir "$category"
                    New-Item -ItemType Directory -Path $dst -Force | Out-Null
                    Move-Item $src (Join-Path $dst $item)
                    $excludedCount++
                }
            }
        }
    }

    # skills: 폴더 단위 (예: django-patterns/)
    foreach ($skill in $exclude.skills) {
        $src = Join-Path $WiwRoot "base\skills\$skill"
        if (Test-Path $src) {
            $dst = Join-Path $excludedDir "skills\$skill"
            New-Item -ItemType Directory -Path (Split-Path $dst) -Force | Out-Null
            Move-Item $src $dst
            $excludedCount++
        }
    }

    Write-Host ""
    Write-Host "  [EXCLUDE] $excludedCount items -> base/_excluded/" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "  [INFO] exclude.json 없음 - 전체 포함" -ForegroundColor Gray
}

# ECC 버전 기록
$eccVersion = git -C $EccPath log -1 --format="%H %s" 2>$null
if ($eccVersion) {
    $eccVersion | Out-File (Join-Path $WiwRoot "base\.ecc-version") -Encoding utf8
    Write-Host ""
    Write-Host "ECC commit: $eccVersion" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== sync 완료 ===" -ForegroundColor Cyan
Write-Host "다음 단계: git add . && git commit -m 'chore: sync ecc' && git push" -ForegroundColor Gray
