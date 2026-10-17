@echo off
title GatePass - Event Check-In Platform
echo =======================================================
echo   GatePass - QR-Based Event Check-In Platform
echo   "Every entry, accounted for."
echo =======================================================
echo.

cd /d "%~dp0"

:: Check if Node is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
  if exist "C:\Program Files\nodejs\node.exe" (
    set "PATH=C:\Program Files\nodejs;%PATH%"
  ) else (
    echo [Notice] Node.js runtime was not detected on this system.
    echo Opening offline standalone GatePass in your web browser instead...
    start "" "%~dp0gatepass-standalone.html"
    exit /b 0
  )
)

:: If node_modules does not exist, install dependencies first
if not exist "node_modules\" (
  echo [GatePass] Installing required npm dependencies (one-time setup)...
  call npm.cmd install
  if %errorlevel% neq 0 (
    echo [Notice] npm install had an issue. Opening standalone version...
    start "" "%~dp0gatepass-standalone.html"
    exit /b 0
  )
)

:: Build dist if not already built
if not exist "dist\" (
  echo [GatePass] Building optimized frontend bundle...
  call npm.cmd run build
)

echo.
echo [GatePass] Starting full-stack server with SQLite database...
echo [GatePass] Opening http://localhost:3001 in your default browser...
echo.

:: Launch browser in background after 2 seconds
start "" powershell -NoProfile -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:3001'"

:: Start the Express production server
call npm.cmd start

pause
