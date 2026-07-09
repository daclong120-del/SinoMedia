# Start SinoMedia Crawler Worker

$ErrorActionPreference = 'Continue'
$PSScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition

Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host "          Starting SinoMedia Crawler Worker...               " -ForegroundColor Cyan
Write-Host "=============================================================" -ForegroundColor Cyan

# 1. Kiểm tra entrypoint worker và tsx
$WorkerRoot = Join-Path $PSScriptRoot "..\worker"
$IndexTs = Join-Path $WorkerRoot "src\index.ts"
$TsxCli = Join-Path $WorkerRoot "node_modules\tsx\dist\cli.js"

if (!(Test-Path $IndexTs)) {
    Write-Error "CRITICAL: worker/src/index.ts not found! Please build the full package first."
    exit 1
}
if (!(Test-Path $TsxCli)) {
    Write-Error "CRITICAL: tsx entrypoint not found at worker/node_modules/tsx/dist/cli.js! Make sure node_modules is fully extracted."
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
    Write-Warning "config/.env not found. Crawler might fail if API_TOKEN is required."
}

# Đảm bảo các biến môi trường bắt buộc cho worker được định nghĩa
if (![System.Environment]::GetEnvironmentVariable("INTERNAL_API_URL")) {
    [System.Environment]::SetEnvironmentVariable("INTERNAL_API_URL", "http://localhost:3000/api/worker")
}

# 3. Khởi chạy tiến trình background
$LogFile = Join-Path $PSScriptRoot "..\logs\worker.log"
$ErrLogFile = Join-Path $PSScriptRoot "..\logs\worker.err.log"
$PidFile = Join-Path $PSScriptRoot "..\logs\worker.pid"

Write-Host "Starting Crawler Worker (running 'crawl' action)..." -ForegroundColor Green
Write-Host "Logs redirected to: logs/worker.log and logs/worker.err.log" -ForegroundColor Gray

# Chạy worker bằng node.exe gọi tsx
$Process = Start-Process -FilePath $NodeExe -ArgumentList "$TsxCli", "$IndexTs", "crawl" -WorkingDirectory $WorkerRoot -NoNewWindow -RedirectStandardOutput $LogFile -RedirectStandardError $ErrLogFile -PassThru

if ($Process) {
    $Process.Id | Out-File -FilePath $PidFile -Force
    Write-Host "Crawler Worker started successfully with PID: $($Process.Id)" -ForegroundColor Green
} else {
    Write-Error "Failed to start Worker process!"
    exit 1
}
