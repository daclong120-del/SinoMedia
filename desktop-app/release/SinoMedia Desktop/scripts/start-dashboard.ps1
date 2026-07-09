# Start SinoMedia Dashboard Server

$ErrorActionPreference = 'Continue'
$PSScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition

Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host "          Starting SinoMedia Dashboard Server...             " -ForegroundColor Cyan
Write-Host "=============================================================" -ForegroundColor Cyan

# 1. Kiểm tra standalone server.js
$ServerJs = Join-Path $PSScriptRoot "..\app\server.js"
if (!(Test-Path $ServerJs)) {
    Write-Error "CRITICAL: app/server.js not found! Please build the full package first."
    exit 1
}

$NodeExe = Join-Path $PSScriptRoot "..\runtime\node\node.exe"
if (!(Test-Path $NodeExe)) {
    Write-Error "CRITICAL: Embedded Node runtime not found at $NodeExe!"
    exit 1
}

# 2. Đọc file .env cấu hình
$EnvFile = Join-Path $PSScriptRoot "..\config\.env"
if (Test-Path $EnvFile) {
    Write-Host "Loading environment variables from config/.env..." -ForegroundColor Gray
    Get-Content $EnvFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and !$line.StartsWith("#") -and $line.Contains("=")) {
            $index = $line.IndexOf("=")
            $name = $line.Substring(0, $index).Trim()
            $value = $line.Substring($index + 1).Trim()
            # Bỏ dấu nháy nếu có
            if ($value.StartsWith('"') -and $value.EndsWith('"')) {
                $value = $value.Substring(1, $value.Length - 2)
            }
            [System.Environment]::SetEnvironmentVariable($name, $value)
        }
    }
} else {
    Write-Warning "config/.env not found. Using default environment settings."
}

# Đặt mặc định PORT là 3000 nếu chưa được thiết lập
if (![System.Environment]::GetEnvironmentVariable("PORT")) {
    [System.Environment]::SetEnvironmentVariable("PORT", "3000")
}
$Port = [System.Environment]::GetEnvironmentVariable("PORT")

# 3. Khởi chạy tiến trình background
$LogFile = Join-Path $PSScriptRoot "..\logs\dashboard.log"
$ErrLogFile = Join-Path $PSScriptRoot "..\logs\dashboard.err.log"
$PidFile = Join-Path $PSScriptRoot "..\logs\dashboard.pid"

Write-Host "Starting Dashboard on port $Port..." -ForegroundColor Green
Write-Host "Logs redirected to: logs/dashboard.log and logs/dashboard.err.log" -ForegroundColor Gray

$Process = Start-Process -FilePath $NodeExe -ArgumentList "$ServerJs" -WorkingDirectory (Join-Path $PSScriptRoot "..\app") -NoNewWindow -RedirectStandardOutput $LogFile -RedirectStandardError $ErrLogFile -PassThru

if ($Process) {
    $Process.Id | Out-File -FilePath $PidFile -Force
    Write-Host "Dashboard Server started successfully with PID: $($Process.Id)" -ForegroundColor Green
} else {
    Write-Error "Failed to start Dashboard process!"
    exit 1
}
