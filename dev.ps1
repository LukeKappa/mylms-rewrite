# MyLMS Development Script
# Run this from the root directory to start all services with hot-reload

param(
    [switch]$BackendOnly,
    [switch]$FrontendOnly,
    [switch]$Install
)

$ErrorActionPreference = "Stop"

# Colors for output
function Write-Header { param($msg) Write-Host "`n=== $msg ===" -ForegroundColor Cyan }
function Write-Success { param($msg) Write-Host $msg -ForegroundColor Green }
function Write-Info { param($msg) Write-Host $msg -ForegroundColor Yellow }

# Install dependencies
if ($Install) {
    Write-Header "Installing Dependencies"
    
    Write-Info "Installing cargo-watch for Rust hot-reload..."
    cargo install cargo-watch
    
    Write-Info "Installing frontend dependencies..."
    Push-Location mylms-dashboard
    npm install
    Pop-Location
    
    Write-Success "Dependencies installed!"
    exit 0
}

# Check if running backend only
if ($BackendOnly) {
    Write-Header "Starting Backend Only"
    Push-Location backend
    $env:RUST_LOG = "mylms_backend=debug,tower_http=debug"
    cargo watch -x run
    Pop-Location
    exit 0
}

# Check if running frontend only
if ($FrontendOnly) {
    Write-Header "Starting Frontend Only"
    Push-Location mylms-dashboard
    npm run dev
    Pop-Location
    exit 0
}

# Start both services
Write-Header "MyLMS Development Server"
Write-Host ""
Write-Host "Starting both services. Use separate terminals for better logs:" -ForegroundColor Gray
Write-Host "  Terminal 1: .\dev.ps1 -BackendOnly" -ForegroundColor White
Write-Host "  Terminal 2: .\dev.ps1 -FrontendOnly" -ForegroundColor White
Write-Host ""
Write-Info "Backend:  http://localhost:3001"
Write-Info "Frontend: http://localhost:3000"
Write-Host ""

# Start backend in background
$backendProcess = Start-Process -FilePath "pwsh" -ArgumentList "-NoExit", "-Command", "cd backend; `$env:RUST_LOG='mylms_backend=debug,tower_http=debug'; cargo watch -x run" -PassThru

# Start frontend in foreground (so Ctrl+C works)
try {
    Push-Location mylms-dashboard
    npm run dev
}
finally {
    Write-Header "Stopping backend..."
    if ($backendProcess -and !$backendProcess.HasExited) {
        Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    Pop-Location
    Write-Success "Done!"
}
