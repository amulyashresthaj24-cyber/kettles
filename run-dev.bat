@echo off
REM ============================================================
REM  Flowmate — live dev launcher
REM  Double-click this (or a desktop shortcut to it) to start the
REM  desktop app in LIVE mode. Frontend changes hot-reload; Rust
REM  changes auto-rebuild. Press Alt+Shift+R in-app to reload the
REM  pet overlay after editing /public/pet files.
REM
REM  Quit fully from the system tray (Quit), not just closing the
REM  window (that hides to tray).
REM ============================================================
cd /d "%~dp0"
echo Starting Flowmate (tauri dev)...
call npm run tauri:dev
echo.
echo Flowmate dev stopped. Press any key to close.
pause >nul
