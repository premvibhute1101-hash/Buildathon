@echo off
title SiteSense Platform Launcher
cls

echo ===================================================
echo     Starting SiteSense Intelligence Platform
echo ===================================================
echo.

:: Get script directory
set ROOT_DIR=%~dp0

echo [1/2] Launching FastAPI Backend Server on port 8000...
start "SiteSense Backend (Port 8000)" cmd /k "cd /d %ROOT_DIR%backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo [2/2] Launching Next.js Frontend Server on port 3000...
start "SiteSense Frontend (Port 3000)" cmd /k "cd /d %ROOT_DIR%frontend && npm run dev"

echo.
echo ===================================================
echo  Both Frontend and Backend services are starting!
echo.
echo  - Frontend URL : http://localhost:3000
echo  - Backend API  : http://127.0.0.1:8000
echo  - Swagger Docs : http://127.0.0.1:8000/docs
echo ===================================================
echo.
echo Keep the opened terminal windows running.
pause
