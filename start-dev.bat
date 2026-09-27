@echo off
title Cyber Cafe Print Hub - Starting Services...
color 0A

echo.
echo  ========================================
echo   CYBER CAFE PRINT HUB - DEV MODE
echo  ========================================
echo.
echo  Starting all services...
echo.

REM Check Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Node.js not found. Please install Node.js 18+
    pause
    exit /b 1
)

REM Start Backend
echo  [1/4] Starting Backend API (port 3001)...
start "Print Hub - Backend" cmd /k "cd /d "%~dp0backend" && node "%APPDATA%\npm\node_modules\npm\bin\npm-cli.js" run dev 2>&1 || npx tsx src/index.ts"

timeout /t 3 /nobreak >nul

REM Start Customer Portal
echo  [2/4] Starting Customer Portal (port 5173)...
start "Print Hub - Customer" cmd /k "cd /d "%~dp0customer-app" && node "%APPDATA%\npm\node_modules\npm\bin\npm-cli.js" run dev"

REM Start Admin Dashboard  
echo  [3/4] Starting Admin Dashboard (port 5174)...
start "Print Hub - Admin" cmd /k "cd /d "%~dp0admin-app" && node "%APPDATA%\npm\node_modules\npm\bin\npm-cli.js" run dev"

REM Start Print Agent
echo  [4/4] Starting Print Agent...
start "Print Hub - Print Agent" cmd /k "cd /d "%~dp0print-agent" && node "%APPDATA%\npm\node_modules\npm\bin\npm-cli.js" run dev"

echo.
echo  ========================================
echo   All services are starting up!
echo  ========================================
echo.
echo   Customer Portal : http://localhost:5173
echo   Admin Dashboard : http://localhost:5174
echo   Backend API     : http://localhost:3001
echo.
echo   Admin Login     : admin@cybercafe.local
echo   Admin Password  : Admin@1234
echo.
echo  Press any key to open the apps in browser...
pause >nul

start http://localhost:5173
start http://localhost:5174

echo  Done! Check the opened browser windows.
timeout /t 5 /nobreak >nul
