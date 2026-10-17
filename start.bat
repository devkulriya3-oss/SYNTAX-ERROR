@echo off
title GatePass
cd /d "%~dp0"
where node >nul 2>nul
if %errorlevel% neq 0 (
  echo Node.js 22.13 or newer is required. Download it from https://nodejs.org
  pause
  exit /b 1
)
start "" powershell -NoProfile -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:3001'"
node server/index.js
pause
