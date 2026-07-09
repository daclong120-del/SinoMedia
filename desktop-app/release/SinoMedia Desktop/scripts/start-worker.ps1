# Start SinoMedia Crawler Worker

$ErrorActionPreference = 'Continue'
$PSScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition

# Dọn dẹp biến môi trường trùng lặp Path/PATH để tránh lỗi của Start-Process/NET
if ($env:PATH -and $env:Path) {
    Get-ChildItem env: | Where-Object { $_.Name -eq "PATH" } | ForEach-Object {
        Remove-Item "env:$($_.Name)" -ErrorAction SilentlyContinue
    }
}

Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host "          Starting SinoMedia Crawler Worker...               " -ForegroundColor Cyan
Write-Host "=============================================================" -ForegroundColor Cyan

# 1. Kiểm tra entrypoint worker và tsx
$WorkerRoot = Join-Path $PSScriptRoot "..\worker"
$IndexTs = Join-Path $WorkerRoot "src\index.ts"
$TsxCli = Join-Path $WorkerRoot "node_modules\tsx\dist\cli.cjs"

if (!(Test-Path $IndexTs)) {
    Write-Error "CRITICAL: worker/src/index.ts not found! Please build the full package first."
    exit 1
}
if (!(Test-Path $TsxCli)) {
    Write-Error "CRITICAL: tsx entrypoint not found at worker/node_modules/tsx/dist/cli.cjs! Make sure node_modules is fully extracted."
    exit 1
}

$NodeExe = Join-Path $PSScriptRoot "..\runtime\node\node.exe"
if (!(Test-Path $NodeExe)) {
    Write-Error "CRITICAL: Embedded Node runtime not found at $NodeExe!"
    exit 1
}

# 2. Đọc file .env cấu hình và gán trực tiếp vào environment của session
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

# 3. Khởi chạy tiến trình background bằng Start-Process trực tiếp
$LogFile = Join-Path $PSScriptRoot "..\logs\worker.log"
$ErrLogFile = Join-Path $PSScriptRoot "..\logs\worker.err.log"
$PidFile = Join-Path $PSScriptRoot "..\logs\worker.pid"

Write-Host "Starting Crawler Worker (running 'crawl' action)..." -ForegroundColor Green
Write-Host "Logs redirected to: logs/worker.log and logs/worker.err.log" -ForegroundColor Gray

# Xóa logs cũ trước khi khởi động
Remove-Item $LogFile -ErrorAction SilentlyContinue | Out-Null
Remove-Item $ErrLogFile -ErrorAction SilentlyContinue | Out-Null

$Process = Start-Process -FilePath $NodeExe -ArgumentList "`"$TsxCli`"", "`"$IndexTs`"", "crawl" -WorkingDirectory $WorkerRoot -NoNewWindow -RedirectStandardOutput $LogFile -RedirectStandardError $ErrLogFile -PassThru

if ($Process) {
    $Process.Id | Out-File -FilePath $PidFile -Force
    Write-Host "Crawler Worker started successfully with PID: $($Process.Id)" -ForegroundColor Green
} else {
    Write-Error "Failed to start Worker process!"
    exit 1
}
