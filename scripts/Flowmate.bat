@echo off
title Flowmate Desktop
cd /d "%~dp0.."
set "BINARY_PATH=src-tauri\target\release\flowmate-desktop.exe"

if not exist "%BINARY_PATH%" (
  echo.
  echo ================================================================
  echo ERROR: Flowmate production binary not found!
  echo Path: %BINARY_PATH%
  echo.
  echo Please compile the app first by running:
  echo   npm run tauri:build
  echo ================================================================
  echo.
  pause
  exit /b 1
)

echo Starting Flowmate Desktop (Production)...
start "" "%BINARY_PATH%"
exit /b 0
