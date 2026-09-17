@echo off
setlocal
cd /d "%~dp0"
if not exist node_modules call npm.cmd ci
if errorlevel 1 goto failed
call npm.cmd run desktop:dev
if errorlevel 1 goto failed
exit /b 0
:failed
echo Read README.md for Node.js, Rust, C++ Build Tools and WebView2 prerequisites.
pause
exit /b 1
