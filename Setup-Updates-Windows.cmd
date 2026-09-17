@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Can cai Node.js 22.12 hoac moi hon.
  pause
  exit /b 1
)
call npm ci
if errorlevel 1 (
  pause
  exit /b 1
)
node scripts/setup-updates.mjs
pause
