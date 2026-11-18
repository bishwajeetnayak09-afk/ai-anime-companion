@echo off
title Kokoro AI - Anime Companion
echo ====================================================
echo        🌸 Starting Kokoro AI Anime Companion 🌸
echo ====================================================
echo.
echo Starting application in your browser...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"

if %ERRORLEVEL% NEQ 0 (
    echo Opening index.html directly...
    start "" "%~dp0index.html"
)
