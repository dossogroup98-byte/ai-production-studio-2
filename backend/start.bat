@echo off
chcp 65001 > nul
echo ========================================================
echo   Starting AI Production Studio Backend (FastAPI)
echo   Host: 127.0.0.1  ^|  Port: 8011  ^|  Reload: ACTIVE
echo ========================================================

REM Check if Python is installed
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python not found in PATH!
    pause
    exit /b 1
)

REM Set Python UTF-8 encoding environment variable
set PYTHONUTF8=1
set PYTHONIOENCODING=utf-8

REM Launch uvicorn with --reload to avoid stale process issues
python -X utf8 -m uvicorn main:app --host 127.0.0.1 --port 8011 --reload
