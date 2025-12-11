# Check if Docker is running
$dockerInfo = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Docker is not running. Please start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}

Write-Host "Starting Backend (Docker)..." -ForegroundColor Green
Set-Location "$PSScriptRoot\backend"

# Download model first to avoid timeout issues
Write-Host "Checking/Downloading Whisper Model (base.en)..." -ForegroundColor Cyan
.\run-docker.ps1 models download base.en

# Run backend in detached mode with default settings
.\run-docker.ps1 start -Detach -Model base.en -Language en

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error starting backend." -ForegroundColor Red
    exit 1
}

Write-Host "Backend started successfully." -ForegroundColor Green

Write-Host "Setting up Frontend..." -ForegroundColor Green
Set-Location "$PSScriptRoot\frontend"

# Install dependencies if node_modules doesn't exist
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    pnpm install
}

Write-Host "Starting Frontend (Tauri)..." -ForegroundColor Green
pnpm tauri dev
