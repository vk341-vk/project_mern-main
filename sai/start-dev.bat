@echo off
title Clearpoint MERN Development Mode
color 0B
echo ========================================================
echo   CLEARPOINT MERN — FULL STACK DEV MODE (Vite + Express)
echo ========================================================
echo.
echo Starting backend (port 5000) and frontend (port 5173)...
echo.

cd /d "%~dp0"
start "" http://localhost:5173
npm run dev
pause
