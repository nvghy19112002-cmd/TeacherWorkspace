@echo off
setlocal
cd /d "%~dp0"
echo Teacher Workspace - Windows build
where node >nul 2>nul
if errorlevel 1 goto missing_node
where cargo >nul 2>nul
if errorlevel 1 goto missing_rust
call npm.cmd ci
if errorlevel 1 goto failed
call npm.cmd run check
if errorlevel 1 goto failed
cargo test --manifest-path src-tauri/Cargo.toml
if errorlevel 1 goto failed
call npm.cmd run desktop:build -- --config src-tauri/tauri.ci.conf.json
if errorlevel 1 goto failed
echo.
echo Build complete. Installer is in src-tauri\target\release\bundle\nsis
start "" explorer "%CD%\src-tauri\target\release\bundle\nsis"
pause
exit /b 0
:missing_node
echo Install Node.js 22.12+ and read README.md, then run this file again.
goto failed
:missing_rust
echo Install Rust stable MSVC and Visual Studio C++ Build Tools. See README.md.
:failed
echo.
echo Build stopped. Read the first error above. No installer is claimed unless all checks pass.
pause
exit /b 1
