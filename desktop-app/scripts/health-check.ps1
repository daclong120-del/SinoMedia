param(
    [switch]$Smoke
)

# SinoMedia Desktop Health Check & Smoke Test Script
$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
if ($ScriptDir.EndsWith("scripts")) {
    $ReleaseDir = Split-Path -Parent $ScriptDir
} else {
    $ReleaseDir = Split-Path -Parent $ScriptDir
}

# Nếu chạy từ desktop-app/scripts thì trỏ sang release/SinoMedia Desktop
if (Test-Path (Join-Path $ReleaseDir "release\SinoMedia Desktop")) {
    $ReleaseDir = Join-Path $ReleaseDir "release\SinoMedia Desktop"
}

Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host "             Running SinoMedia Desktop Health Check          " -ForegroundColor Cyan
Write-Host "             Release Path: $ReleaseDir" -ForegroundColor Gray
Write-Host "             Smoke Mode: $(if ($Smoke) { 'Enabled' } else { 'Disabled' })" -ForegroundColor Gray
Write-Host "=============================================================" -ForegroundColor Cyan

$Success = $true
$Manifest = $null

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

# 6. Chạy Smoke Test (nếu được kích hoạt và kiểm tra cơ bản pass)
if ($Smoke) {
    if (!$Success) {
        Write-Error "Smoke test aborted because basic health check failed."
    } elseif (!$Manifest -or !$Manifest.includes -or $Manifest.buildMode -eq "Scaffold") {
        Write-Warning "Smoke test skipped: buildMode is Scaffold or includes metadata is missing."
    } else {
        Write-Host "`n--- Running Smoke Test ---" -ForegroundColor Cyan
        $SmokeSuccess = $true
        
        # Launcher paths
        $StartDashScript = Join-Path $ReleaseDir "scripts\start-dashboard.ps1"
        $StartWorkerScript = Join-Path $ReleaseDir "scripts\start-worker.ps1"
        $StopScript = Join-Path $ReleaseDir "scripts\stop-services.ps1"
        
        if (!(Test-Path $StartDashScript) -or !(Test-Path $StartWorkerScript) -or !(Test-Path $StopScript)) {
            Write-Error "CRITICAL: Launcher scripts (start/stop) are missing from release scripts folder!"
            $SmokeSuccess = $false
            $Success = $false
        } else {
            # Bước A: Khởi động Dashboard
            Write-Host "[Smoke] Launching Dashboard server..." -ForegroundColor Gray
            & $StartDashScript
            
            # Kiểm tra port 3000
            Write-Host "[Smoke] Verifying Dashboard HTTP port..." -ForegroundColor Gray
            $PortOk = $false
            $Checks = 0
            $MaxChecks = 6
            $DashboardUri = "http://localhost:3000/login"
            
            while ($Checks -lt $MaxChecks -and !$PortOk) {
                Start-Sleep -Seconds 2
                $Checks++
                try {
                    # Dùng Invoke-WebRequest để kiểm tra port 3000
                    $Response = Invoke-WebRequest -Uri $DashboardUri -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
                    if ($Response.StatusCode -ge 200 -and $Response.StatusCode -lt 500) {
                        $PortOk = $true
                    }
                } catch {
                    # Lỗi kết nối thường xảy ra khi port chưa mở
                    if ($_.Exception.Message -match "Unable to connect" -or $_.Exception.InnerException.Message -match "connection refused") {
                        Write-Host "        Attempt $Checks/${MaxChecks}: Waiting for Dashboard port 3000 to listen..." -ForegroundColor Yellow
                    } else {
                        # Lỗi do HTTP (VD: 404, 302, 401) vẫn nghĩa là server đang chạy và xử lý HTTP
                        $PortOk = $true
                    }
                }
            }
            
            if ($PortOk) {
                Write-Host "[Smoke OK] Dashboard responds successfully at $DashboardUri" -ForegroundColor Green
            } else {
                Write-Error "[Smoke FAILED] Dashboard port 3000 failed to respond after $($MaxChecks * 2) seconds."
                $SmokeSuccess = $false
            }
            
            # Bước B: Khởi động Worker
            Write-Host "[Smoke] Launching Crawler Worker..." -ForegroundColor Gray
            & $StartWorkerScript
            
            # Chờ worker boot
            Start-Sleep -Seconds 4
            
            # Kiểm tra PID worker
            $WorkerPidFile = Join-Path $ReleaseDir "logs\worker.pid"
            $WorkerRunning = $false
            
            if (Test-Path $WorkerPidFile) {
                $wPidVal = (Get-Content $WorkerPidFile -Raw) -replace '[^\d]'
                if ($wPidVal) {
                    $wPidInt = [int]$wPidVal
                    $proc = Get-Process -Id $wPidInt -ErrorAction SilentlyContinue
                    if ($proc -and !$proc.HasExited) {
                        $WorkerRunning = $true
                        Write-Host "[Smoke OK] Crawler Worker is running under PID: $wPidInt" -ForegroundColor Green
                    }
                }
            }
            
            if (!$WorkerRunning) {
                Write-Error "[Smoke FAILED] Crawler Worker process is not running or exited immediately."
                $SmokeSuccess = $false
            }
            
            # Bước C: Tắt toàn bộ dịch vụ (luôn chạy để dọn dẹp)
            Write-Host "[Smoke] Cleaning up: stopping all services..." -ForegroundColor Gray
            & $StopScript
            
            if ($SmokeSuccess) {
                Write-Host "[SUCCESS] Smoke test completed successfully! Dashboard & Worker verified." -ForegroundColor Green
            } else {
                Write-Host "[FAILED] Smoke test failed!" -ForegroundColor Red
                $Success = $false
            }
        }
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
