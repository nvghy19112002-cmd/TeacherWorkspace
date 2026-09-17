@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Build-Signed-Windows.ps1"
if errorlevel 1 (
  echo Build failed. Read the first error above.
  pause
  exit /b 1
)
echo Build complete. Installer and signature are in src-tauri\target\release\bundle\nsis.
echo latest.json is in this project folder.
pause
