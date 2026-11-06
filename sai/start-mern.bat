@echo off
title Clearpoint MERN Attendance Server
color 0A
echo ========================================================
echo   CLEARPOINT MULTI-FACTOR ATTENDANCE SYSTEM (MERN)
echo ========================================================
echo.
echo Starting Clearpoint MERN Server on port 5000...
echo.

cd /d "%~dp0"
if not exist "client\dist\index.html" (
    echo Building React Client first...
    cd client
    call npm run build
    cd ..
)

start "" http://localhost:5000
cd server
node server.js
pause
