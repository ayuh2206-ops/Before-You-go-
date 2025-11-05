# run-local-check.ps1
# Usage: open PowerShell as Administrator (or normal shell), cd to the backend folder and run: .\run-local-check.ps1
# What it does:
# 1) Runs npm install
# 2) Starts node server.js in background and captures its PID
# 3) Waits a few seconds and runs the smoke test (node smoke-test.js)
# 4) Prints collected output and kills the server process
# Notes: This script runs only on Windows PowerShell (not pwsh on *nix). Adjust as needed.

$ErrorActionPreference = 'Stop'

Write-Host "===== Running local backend check =====" -ForegroundColor Cyan

# 1) npm install
Write-Host "Running npm install... (this may take a minute)" -ForegroundColor Yellow
npm install 2>&1 | Tee-Object -Variable npmInstallOutput
if ($LASTEXITCODE -ne 0) {
    Write-Host "npm install failed. Output:" -ForegroundColor Red
    $npmInstallOutput | Select-Object -First 200
    exit 3
}
Write-Host "npm install completed." -ForegroundColor Green

# 2) Start server in background
Write-Host "Starting server (node server.js) in background..." -ForegroundColor Yellow
$startInfo = New-Object System.Diagnostics.ProcessStartInfo
$startInfo.FileName = "node"
$startInfo.Arguments = "server.js"
$startInfo.WorkingDirectory = (Get-Location)
$startInfo.UseShellExecute = $false
$startInfo.RedirectStandardOutput = $true
$startInfo.RedirectStandardError = $true

$process = New-Object System.Diagnostics.Process
$process.StartInfo = $startInfo
$started = $process.Start()
if (-not $started) {
    Write-Host "Failed to start node server." -ForegroundColor Red
    exit 4
}

Write-Host "Server started (PID: $($process.Id)). Waiting 2.5s for startup..." -ForegroundColor Green
Start-Sleep -Seconds 3

# Collect a snippet of the server output if any
$stdout = $process.StandardOutput.ReadToEndAsync()
$stderr = $process.StandardError.ReadToEndAsync()
Start-Sleep -Milliseconds 500

# 3) Run smoke test
Write-Host "Running smoke test (node smoke-test.js)..." -ForegroundColor Yellow
$smoke = & node smoke-test.js 2>&1 | Tee-Object -Variable smokeOutput
$smokeExit = $LASTEXITCODE

Write-Host "----- smoke test output -----" -ForegroundColor Cyan
$smokeOutput | ForEach-Object { Write-Host $_ }
Write-Host "-----------------------------" -ForegroundColor Cyan

# 4) Print server stdout/stderr snippets
Write-Host "----- server stdout (partial) -----" -ForegroundColor Cyan
try { $so = $stdout.Result; if ($so) { $so.Split("`n") | Select-Object -First 50 | ForEach-Object { Write-Host $_ } } else { Write-Host "<no stdout captured>" } } catch { Write-Host "<could not capture stdout>" }
Write-Host "----- server stderr (partial) -----" -ForegroundColor Cyan
try { $se = $stderr.Result; if ($se) { $se.Split("`n") | Select-Object -First 50 | ForEach-Object { Write-Host $_ } } else { Write-Host "<no stderr captured>" } } catch { Write-Host "<could not capture stderr>" }
Write-Host "-----------------------------------" -ForegroundColor Cyan

# 5) Kill server process we started
try {
    if (-not $process.HasExited) {
        Write-Host "Stopping server (PID $($process.Id))..." -ForegroundColor Yellow
        $process.Kill()
        Start-Sleep -Seconds 1
    }
} catch {
    Write-Host "Failed to stop server process: $_" -ForegroundColor Red
}

# Exit with smoke test exit code
if ($smokeExit -eq 0) {
    Write-Host "Smoke test passed." -ForegroundColor Green
    exit 0
} else {
    Write-Host "Smoke test failed with exit code $smokeExit." -ForegroundColor Red
    exit $smokeExit
}
