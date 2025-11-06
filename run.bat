@echo off
REM destinationGuide Startup Script

echo.
echo ====================================
echo   Destination Guide - Flask App
echo ====================================
echo.

REM Check if ANTHROPIC_API_KEY is set
if "%ANTHROPIC_API_KEY%"=="" (
    echo [ERROR] ANTHROPIC_API_KEY environment variable is not set!
    echo.
    echo To set it temporarily for this session:
    echo   set ANTHROPIC_API_KEY=your-api-key-here
    echo.
    echo To get an API key, visit: https://console.anthropic.com/
    echo.
    pause
    exit /b 1
)

echo [OK] ANTHROPIC_API_KEY is set
echo.
echo Starting Flask app...
echo Visit: http://localhost:5000
echo Press Ctrl+C to stop the server
echo.

C:\Python312\python.exe app.py
