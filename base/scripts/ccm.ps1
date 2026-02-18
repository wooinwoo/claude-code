#!/usr/bin/env pwsh
# ccmanager multi-project launcher
# Usage: pwsh ccm.ps1

$env:CCMANAGER_MULTI_PROJECT_ROOT = "C:\_project\service"
ccmanager --multi-project
