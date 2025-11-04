# start-local.ps1 — helper to start a simple static server
# Usage: Open PowerShell, cd to project folder and run: .\start-local.ps1

try {
    $node = Get-Command node -ErrorAction SilentlyContinue
} catch {
    $node = $null
}

if (-not $node) {
    Write-Host "Node.js is not found on this machine." -ForegroundColor Yellow
    Write-Host "Please install Node.js (LTS) from https://nodejs.org and re-run this script." -ForegroundColor Cyan
    exit 1
}

# Prefer npx http-server to avoid global installs
Write-Host "Node.js found. Attempting to run 'npx http-server -p 8000'..." -ForegroundColor Green

# Try to run npx http-server
$proc = Start-Process -FilePath "npx" -ArgumentList "http-server -p 8000" -NoNewWindow -PassThru -RedirectStandardOutput "npx-out.log" -RedirectStandardError "npx-err.log"

Write-Host "Started http-server via npx. If the window didn't show server output, check npx-out.log and npx-err.log in the project folder." -ForegroundColor Green
Write-Host "Open: http://localhost:8000" -ForegroundColor Cyan

# If you prefer to run in the foreground, run these commands manually:
Write-Host "Or run manually in the current shell to see real-time output:" -ForegroundColor Yellow
Write-Host "npx http-server -p 8000" -ForegroundColor Cyan

# Helpful commands to collect logs if npm install fails elsewhere
Write-Host "If npm install fails, collect a verbose log with:" -ForegroundColor Yellow
Write-Host "npm install --verbose 2>&1 | Tee-Object npm-install.log" -ForegroundColor Cyan

exit 0
