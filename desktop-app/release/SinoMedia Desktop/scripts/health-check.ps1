# SinoMedia Desktop Health Check Script

$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
# Xác định thư mục Release root.
# Script này có thể chạy từ desktop-app/scripts/ hoặc release/SinoMedia Desktop/scripts/.
# Nếu thư mục cha là "scripts", Release root sẽ là thư mục cha của "scripts".
# Ngược lại, nếu chạy từ nơi khác, ta cần xác định tương đối.
if ($ScriptDir.EndsWith("scripts")) {
    $ReleaseDir = Split-Path -Parent $ScriptDir
} else {
    # Fallback nếu chạy trực tiếp ngoài Release root hoặc từ desktop-app/scripts
    $ReleaseDir = Split-Path -Parent $ScriptDir
}

# Nếu chạy từ desktop-app/scripts thì trỏ sang release/SinoMedia Desktop
if (Test-Path (Join-Path $ReleaseDir "release\SinoMedia Desktop")) {
    $ReleaseDir = Join-Path $ReleaseDir "release\SinoMedia Desktop"
}

Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host "             Running SinoMedia Desktop Health Check          " -ForegroundColor Cyan
Write-Host "             Release Path: $ReleaseDir" -ForegroundColor Gray
Write-Host "=============================================================" -ForegroundColor Cyan

$Success = $true

# 1. Kiểm tra manifest.json
$ManifestPath = Join-Path $ReleaseDir "manifest.json"
if (!(Test-Path $ManifestPath)) {
    Write-Error "CRITICAL: manifest.json is missing!"
    $Success = $false
} else {
    try {
        $Manifest = Get-Content -Raw -Path $ManifestPath | ConvertFrom-Json
        Write-Host "[OK] manifest.json exists and is valid JSON." -ForegroundColor Green
        Write-Host "     Version: $($Manifest.version)" -ForegroundColor Gray
        Write-Host "     Build Mode: $($Manifest.buildMode)" -ForegroundColor Gray
        Write-Host "     Generated At: $($Manifest.generatedAt)" -ForegroundColor Gray
        Write-Host "     Source Commit: $($Manifest.sourceCommit)" -ForegroundColor Gray
    } catch {
        Write-Error "CRITICAL: Failed to parse manifest.json: $_"
        $Success = $false
    }
}

# 2. Kiểm tra config/env.template
$EnvTemplatePath = Join-Path $ReleaseDir "config\env.template"
if (!(Test-Path $EnvTemplatePath)) {
    Write-Error "CRITICAL: config/env.template is missing!"
    $Success = $false
} else {
    Write-Host "[OK] config/env.template exists." -ForegroundColor Green
}

# 3. Kiểm tra các thư mục app/, worker/, runtime/, logs/, data/
$DirsToCheck = @("app", "worker", "runtime", "logs", "data")
foreach ($dir in $DirsToCheck) {
    $dirPath = Join-Path $ReleaseDir $dir
    if (!(Test-Path $dirPath)) {
        Write-Error "CRITICAL: Required directory '$dir' is missing!"
        $Success = $false
    } else {
        Write-Host "[OK] Directory '$dir' exists." -ForegroundColor Green
    }
}

# 4. Kiểm tra rò rỉ SUPABASE_SERVICE_ROLE_KEY trong config/
$ConfigDir = Join-Path $ReleaseDir "config"
$ServiceRoleFound = $false
if (Test-Path $ConfigDir) {
    $Files = Get-ChildItem -Path $ConfigDir -File -Recurse
    foreach ($file in $Files) {
        $content = Get-Content -Raw -Path $file.FullName
        if ($content -match "SUPABASE_SERVICE_ROLE_KEY") {
            Write-Error "CRITICAL: SUPABASE_SERVICE_ROLE_KEY was found in config file '$($file.Name)'!"
            $ServiceRoleFound = $true
        }
    }
}
if ($ServiceRoleFound) {
    $Success = $false
} else {
    Write-Host "[OK] No SUPABASE_SERVICE_ROLE_KEY leakage detected in config/ directory." -ForegroundColor Green
}

# 5. Kiểm tra tính hợp lệ của dashboard/worker/runtime theo manifest.json
if ($Success -and $Manifest) {
    $Includes = $Manifest.includes
    if ($Includes) {
        # Dashboard check
        if ($Includes.dashboard -eq $true) {
            $ServerJs = Join-Path $ReleaseDir "app\server.js"
            if (!(Test-Path $ServerJs)) {
                Write-Error "CRITICAL: Dashboard is marked true in manifest but app/server.js is missing!"
                $Success = $false
            } else {
                Write-Host "[OK] Dashboard component verified (app/server.js exists)." -ForegroundColor Green
            }
        } else {
            Write-Host "[PLANNED] Dashboard component is planned (marked false in manifest)." -ForegroundColor Yellow
        }

        # Worker check
        if ($Includes.worker -eq $true) {
            $WorkerPkg = Join-Path $ReleaseDir "worker\package.json"
            if (!(Test-Path $WorkerPkg)) {
                Write-Error "CRITICAL: Worker is marked true in manifest but worker/package.json is missing!"
                $Success = $false
            } else {
                Write-Host "[OK] Worker component verified (worker/package.json exists)." -ForegroundColor Green
            }
        } else {
            Write-Host "[PLANNED] Worker component is planned (marked false in manifest)." -ForegroundColor Yellow
        }

        # Embedded Runtime check
        if ($Includes.embeddedRuntime -eq $true) {
            $NodeExe = Join-Path $ReleaseDir "runtime\node\node.exe"
            if (!(Test-Path $NodeExe)) {
                Write-Error "CRITICAL: Embedded Runtime is marked true in manifest but runtime/node/node.exe is missing!"
                $Success = $false
            } else {
                Write-Host "[OK] Embedded Node runtime verified (runtime/node/node.exe exists)." -ForegroundColor Green
            }
        } else {
            Write-Host "[PLANNED] Embedded Node runtime is planned (marked false in manifest)." -ForegroundColor Yellow
        }
    } else {
        Write-Warning "No 'includes' metadata section found in manifest.json."
    }
}

Write-Host "=============================================================" -ForegroundColor Cyan
if ($Success) {
    Write-Host "[SUCCESS] Health check passed successfully!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "[FAILED] Health check encountered critical errors!" -ForegroundColor Red
    exit 1
}
