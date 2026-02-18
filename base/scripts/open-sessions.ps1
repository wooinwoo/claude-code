param(
    [switch]$UseCCManager,
    [string[]]$Projects = @(
        "C:\_project\service\cds-site",
        "C:\_project\service\cds-server",
        "C:\_project\service\cims-site",
        "C:\_project\service\cims-server",
        "C:\_project\service\halo-server",
        "C:\_project\service\bid-ai-site"
    )
)

if ($UseCCManager) {
    # ccmanager multi-project 모드로 실행
    $env:CCMANAGER_MULTI_PROJECT_ROOT = "C:\_project\service"
    ccmanager --multi-project
    return
}

# Windows Terminal로 각 프로젝트를 새 탭으로 열기
$first = $true
foreach ($proj in $Projects) {
    $name = Split-Path $proj -Leaf
    if ($first) {
        wt -d $proj --title $name
        Start-Sleep -Milliseconds 500
        $first = $false
    } else {
        wt -w 0 nt -d $proj --title $name
        Start-Sleep -Milliseconds 300
    }
}

Write-Host "6개 프로젝트 탭 열림!" -ForegroundColor Green
