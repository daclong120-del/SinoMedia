@echo off
title SinoMedia Starter
echo ==========================================
echo       SinoMedia All-in-One Starter        
echo ==========================================
echo.

:: 1. Check Docker status
echo [1/4] Checking Docker status...
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo Docker is not running. Starting Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    echo Waiting for Docker daemon to become ready...
    :wait_docker
    docker ps >nul 2>&1
    if %errorlevel% neq 0 (
        timeout /t 3 >nul
        goto wait_docker
    )
    echo Docker is ready!
) else (
    echo Docker is already running.
)
echo.

:: 2. Start Supabase
echo [2/4] Starting Supabase backend...
call npx supabase start
echo.

:: 3. Start Next.js Frontend
echo [3/4] Starting Next.js Frontend...
start "SinoMedia Frontend" cmd /k "cd dashboard && npm run dev"
echo.

:: 4. Start Crawler Pipeline
echo [4/4] Starting Crawler Pipeline...
start "SinoMedia Crawler Worker" cmd /k "cd crawler-pipeline && npm run crawl"
echo.

echo ==========================================
echo All services have been launched!
echo - Frontend: http://localhost:3000
echo - Supabase Studio: http://127.0.0.1:54323
echo ==========================================
pause
