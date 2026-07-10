@echo off
setlocal
chcp 65001 >nul
title AICodeMirror Codex 5.6

fltmc >nul 2>nul
if errorlevel 1 (
  set "CODEXFAST_LAUNCHER=%~f0"
  powershell.exe -NoProfile -NonInteractive -Command "Start-Process -FilePath $env:CODEXFAST_LAUNCHER -Verb RunAs"
  exit /b
)

where node.exe >nul 2>nul
if errorlevel 1 (
  echo codexfast requires Node.js 18.12 or newer.
  echo Install Node.js and run this launcher again.
  pause
  exit /b 1
)

if "%~1"=="" (
  node "%~dp0codexfast"
) else (
  node "%~dp0codexfast" %*
)
set "CODEXFAST_EXIT=%ERRORLEVEL%"
if not "%CODEXFAST_EXIT%"=="0" pause
exit /b %CODEXFAST_EXIT%
