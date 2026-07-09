$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ProjectRoot = Split-Path -Parent $ScriptDir
$ReleaseDir = Join-Path $ProjectRoot "release\SinoMedia Desktop"

Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host "       Building SinoMedia Desktop Runtime Package Skeleton     " -ForegroundColor Cyan
Write-Host "=============================================================" -ForegroundColor Cyan

# 1. Create skeleton directories
Write-Host "[1/3] Creating skeleton directories..."
$Dirs = @("app", "worker", "runtime", "config", "logs", "data", "scripts")
foreach ($dir in $Dirs) {
    $path = Join-Path $ReleaseDir $dir
    if (!(Test-Path $path)) {
        New-Item -ItemType Directory -Force -Path $path | Out-Null
    }
}
Write-Host "Directories created at: $ReleaseDir" -ForegroundColor Green

# 2. Copy templates and scripts
Write-Host "[2/3] Copying templates and scripts..."
$EnvTemplate = Join-Path $ProjectRoot "templates\env.template"
if (Test-Path $EnvTemplate) {
    Copy-Item -Path $EnvTemplate -Destination (Join-Path $ReleaseDir "config\env.template") -Force
}

$Scripts = @("start-dashboard.ps1", "start-worker.ps1", "health-check.ps1")
foreach ($script in $Scripts) {
    $scriptPath = Join-Path $ScriptDir $script
    if (Test-Path $scriptPath) {
        Copy-Item -Path $scriptPath -Destination (Join-Path $ReleaseDir "scripts\") -Force
    }
}
Write-Host "Templates and scripts copied." -ForegroundColor Green

# 3. Create manifest.json
Write-Host "[3/3] Generating manifest.json..."
$ManifestPath = Join-Path $ReleaseDir "manifest.json"
$ManifestContent = @"
{
  "name": "SinoMedia Desktop Runtime Package",
  "status": "scaffold",
  "includes": {
    "dashboard": false,
    "worker": false,
    "embeddedRuntime": false
  }
}
"@
Set-Content -Path $ManifestPath -Value $ManifestContent
Write-Host "manifest.json created." -ForegroundColor Green

Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host "[SUCCESS] Release skeleton created." -ForegroundColor Green
Write-Host "Path: $ReleaseDir"
Write-Host "=============================================================" -ForegroundColor Cyan
