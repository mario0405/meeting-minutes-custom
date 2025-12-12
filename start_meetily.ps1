# Meetily - One-Click Startup Script for Windows
# This script starts all required services for Meetily

param(
    [switch]$NoFrontend,  # Only start backend services
    [switch]$Stop         # Stop all services instead of starting
)

$ErrorActionPreference = "Continue"
$ProjectRoot = $PSScriptRoot
$BackendDir = Join-Path $ProjectRoot "backend"
$FrontendDir = Join-Path $ProjectRoot "frontend"

function Write-Status {
    param([string]$Message, [string]$Color = "Cyan")
    Write-Host "[MEETILY] $Message" -ForegroundColor $Color
}

function Test-DockerRunning {
    try {
        $null = docker info 2>$null
        return $?
    } catch {
        return $false
    }
}

function Wait-ForService {
    param([string]$Url, [string]$ServiceName, [int]$MaxAttempts = 30)
    
    Write-Status "Waiting for $ServiceName to be ready..." "Yellow"
    for ($i = 1; $i -le $MaxAttempts; $i++) {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                Write-Status "$ServiceName is ready!" "Green"
                return $true
            }
        } catch {
            # Service not ready yet
        }
        Start-Sleep -Seconds 1
        Write-Host "." -NoNewline
    }
    Write-Host ""
    Write-Status "$ServiceName failed to start in time" "Red"
    return $false
}

# Stop mode
if ($Stop) {
    Write-Status "Stopping Meetily services..." "Yellow"
    
    # Stop Docker containers
    Push-Location $BackendDir
    docker compose down 2>$null
    Pop-Location
    
    # Kill any running Tauri/Next.js processes
    Get-Process -Name "meetily*" -ErrorAction SilentlyContinue | Stop-Process -Force
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*meetily*" -or $_.CommandLine -like "*3118*" } | Stop-Process -Force
    
    Write-Status "All services stopped!" "Green"
    exit 0
}

# Check Docker is running
Write-Status "Checking Docker..." "Cyan"
if (-not (Test-DockerRunning)) {
    Write-Status "Docker is not running! Please start Docker Desktop first." "Red"
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}
Write-Status "Docker is running" "Green"

# Start backend services
Write-Status "Starting backend services (Whisper + Meetily API)..." "Cyan"
Push-Location $BackendDir

# Start docker compose
docker compose up -d whisper-server meetily-backend 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Status "Failed to start Docker containers!" "Red"
    Pop-Location
    exit 1
}
Pop-Location

# Wait for services to be healthy
$whisperReady = Wait-ForService "http://localhost:8178/" "Whisper Server"
$backendReady = Wait-ForService "http://localhost:5167/docs" "Meetily Backend"

if (-not $whisperReady -or -not $backendReady) {
    Write-Status "Some services failed to start. Check Docker logs with:" "Red"
    Write-Host "  docker logs whisper-server" -ForegroundColor Yellow
    Write-Host "  docker logs meetily-backend" -ForegroundColor Yellow
    exit 1
}

Write-Status "Backend services are running!" "Green"
Write-Host ""
Write-Host "  - Whisper Server: http://localhost:8178" -ForegroundColor White
Write-Host "  - Backend API:    http://localhost:5167" -ForegroundColor White
Write-Host "  - API Docs:       http://localhost:5167/docs" -ForegroundColor White
Write-Host ""

# Start frontend if not disabled
if (-not $NoFrontend) {
    Write-Status "Starting Meetily desktop app..." "Cyan"
    Write-Host ""
    Write-Host "  The app will open automatically once compiled." -ForegroundColor Yellow
    Write-Host "  First-time compilation may take a few minutes." -ForegroundColor Yellow
    Write-Host ""
    
    Push-Location $FrontendDir
    
    # Start Tauri in a new window
    Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "pnpm run tauri:dev" -WorkingDirectory $FrontendDir
    
    Pop-Location
    
    Write-Status "Frontend starting in a new window..." "Green"
} else {
    Write-Status "Frontend skipped (use without -NoFrontend to start the desktop app)" "Yellow"
}

Write-Host ""
Write-Status "========================================" "Green"
Write-Status "  Meetily is starting!" "Green"
Write-Status "========================================" "Green"
Write-Host ""
Write-Host "Tips:" -ForegroundColor Cyan
Write-Host "  - First compilation takes a few minutes" -ForegroundColor White
Write-Host "  - The desktop window will appear when ready" -ForegroundColor White
Write-Host "  - To stop all services: .\start_meetily.ps1 -Stop" -ForegroundColor White
Write-Host ""
