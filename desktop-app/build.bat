@echo off
title Build SinoMedia Desktop App
color 0A
cls

echo =============================================================
echo               SinoMedia Desktop App Builder
echo =============================================================
echo.
echo [1/3] Checking if Next.js local server is active...
echo (Make sure you ran "npm run dev" in the dashboard directory)
echo.

:: Check if port 3000 is open
netstat -ano | findstr :3000 >nul
if %errorlevel% neq 0 (
    echo [WARNING] Port 3000 is not active. 
    echo.
    echo Please make sure you have started your Next.js server:
    echo 1. Open a terminal
    echo 2. Go to: d:\Python\SinoMedia\dashboard
    echo 3. Run: npm run dev
    echo.
    set /p choice="Do you want to continue anyway? (y/n): "
    if /I "%choice%" neq "y" goto end
)

echo.
echo [2/3] Packing http://localhost:3000 into a Desktop App...
echo.

:: Run pake command to package the website (relative path to icon from desktop-app folder)
npx -y pake-cli http://localhost:3000 --name "SinoMedia" --icon "../dashboard/public/favicon.ico" --height 900 --width 1400

if %errorlevel% equ 0 (
    echo.
    echo =============================================================
    echo [SUCCESS] Package created successfully!
    echo Check for the "SinoMedia.exe" in this folder: d:\Python\SinoMedia\desktop-app
    echo =============================================================
) else (
    echo.
    echo [ERROR] Pake failed to build the application.
    echo Please check if Rust/Cargo or Node.js are configured properly.
)

:end
echo.
pause
