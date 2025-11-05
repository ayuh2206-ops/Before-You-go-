@echo off
REM run-local-check.bat — Windows batch alternative to the PowerShell script
REM Usage: open Command Prompt, cd to backend and run: run-local-check.bat

cd /d "%~dp0"
echo ===== Running local backend check =====

echo Running npm install... (this may take a minute)
npm install
if %errorlevel% neq 0 (
  echo npm install failed. Check the output above.
  pause
  exit /b 3
)
echo npm install completed.

echo Starting server in a new window (logs -> server.log)...

REM Start server in a new cmd window and keep it open so you can view logs later.
start "BYG Server" cmd /k "node server.js > server.log 2>&1"

necho Waiting 3 seconds for server startup...
timeout /t 3 /nobreak >nul

necho Running smoke test (node smoke-test.js)...
node smoke-test.js
if %errorlevel% neq 0 (
  echo Smoke test failed with exit code %errorlevel%.
  echo Check server.log in this directory and the new 'BYG Server' window for details.
  pause
  exit /b %errorlevel%
)
echo Smoke test passed. Server is responding.
echo Server logs are in server.log and the server is running in the separate 'BYG Server' window.
pause
exit /b 0
