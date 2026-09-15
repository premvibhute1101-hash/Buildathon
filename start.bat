@echo off
title SiteSense Intelligence Platform Launcher
cls

echo ================================================================
echo       SITESENSE - CONSTRUCTION INTELLIGENCE PLATFORM
echo ================================================================
echo.

:: Get script directory root
set ROOT_DIR=%~dp0

echo Checking environment and starting services...
echo.

:: [1/2] Start Backend (FastAPI + Uvicorn)
echo [1/2] Launching FastAPI Backend Server on port 8000...
start "SiteSense Backend (Port 8000)" cmd /k "cd /d %ROOT_DIR%backend && echo Starting FastAPI backend... && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

:: [2/2] Start Frontend (Next.js)
echo [2/2] Launching Next.js Frontend Server on port 3000...
start "SiteSense Frontend (Port 3000)" cmd /k "cd /d %ROOT_DIR%frontend && echo Starting Next.js frontend... && npm run dev"

echo.
echo ================================================================
echo  All Services Initialized Successfully!
echo ================================================================
echo.
echo  - Frontend Web UI     : http://localhost:3000
echo  - Site Comparisons   : http://localhost:3000/comparisons
echo  - Backend REST API    : http://127.0.0.1:8000
echo  - Interactive API Docs: http://127.0.0.1:8000/docs
echo.
echo  Demo Sign-In Credentials:
echo  --------------------------
echo  Admin / Director  : admin@example.com      ^| password
echo  Safety Officer    : safety@example.com     ^| password
echo  Site Supervisor   : supervisor@example.com ^| password
echo.
echo  Quick Commands in individual terminal windows:
echo  - Backend Tests   : cd backend ^&^& python -m pytest -v
echo  - Frontend Tests  : cd frontend ^&^& npm test
echo  - Seed Database   : cd backend ^&^& python seed.py
echo ================================================================
echo.
echo Keep this window and the spawned service windows open.
pause
