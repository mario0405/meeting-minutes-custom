<# 
    Meetily Development Startup Script
    ===================================
    This script starts all required services for Meetily development:
    1. Whisper Server (speech-to-text) on port 8178
    2. Python Backend API on port 5167  
    3. Tauri Desktop App (frontend + Rust backend)
    
    Usage: .\start_meetily_dev.ps1
    To stop: Press Ctrl+C or run .\stop_meetily.ps1
#>

$ErrorActionPreference = "Continue"
$Host.UI.RawUI.WindowTitle = "Meetily Dev Launcher"

# Colors for output
function Write-Step { param($msg) Write-Host "`n>>> $msg" -ForegroundColor Cyan }
function Write-Success { param($msg) Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err { param($msg) Write-Host "[ERROR] $msg" -ForegroundColor Red }
function Write-Info { param($msg) Write-Host "[INFO] $msg" -ForegroundColor White }

# Project paths
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $ProjectRoot "backend"
$FrontendDir = Join-Path $ProjectRoot "frontend"
$WhisperServerPath = Join-Path $BackendDir "whisper.cpp\build\bin\Release\whisper-server.exe"
$WhisperModelPath = Join-Path $BackendDir "whisper-server-package\models\ggml-small.bin"

Write-Host "`n" 
Write-Host "=================================================================" -ForegroundColor Magenta
Write-Host "           MEETILY DEVELOPMENT LAUNCHER                         " -ForegroundColor Magenta
Write-Host "=================================================================" -ForegroundColor Magenta
Write-Host "`n"

# ============================================================================
# STEP 1: Check Prerequisites
# ============================================================================
Write-Step "Checking prerequisites..."

# Check Node.js
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Err "Node.js is not installed. Please install Node.js first."
    exit 1
}
Write-Success "Node.js: $nodeVersion"

# Check pnpm
$pnpmVersion = pnpm --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Warn "pnpm not found, installing..."
    npm install -g pnpm
}
Write-Success "pnpm: $(pnpm --version)"

# Check Rust
$rustVersion = rustc --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Err "Rust is not installed. Please install Rust first: https://rustup.rs"
    exit 1
}
Write-Success "Rust: $rustVersion"

# Check Python
$pythonPath = "C:/Users/$env:USERNAME/AppData/Local/Microsoft/WindowsApps/python3.12.exe"
if (-not (Test-Path $pythonPath)) {
    # Try default python
    $pythonPath = (Get-Command python -ErrorAction SilentlyContinue).Source
    if (-not $pythonPath) {
        Write-Err "Python not found. Please install Python 3.12+"
        exit 1
    }
}
$pythonVersion = & $pythonPath --version 2>$null
Write-Success "Python: $pythonVersion"

# ============================================================================
# STEP 2: Kill any existing processes on our ports
# ============================================================================
Write-Step "Cleaning up existing processes..."

function Stop-ProcessOnPort {
    param([int]$Port)
    $connections = netstat -ano | Select-String ":$Port " | Select-String "LISTENING"
    foreach ($conn in $connections) {
        $parts = $conn -split '\s+'
        $pid = $parts[-1]
        if ($pid -match '^\d+$' -and $pid -ne '0') {
            try {
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                Write-Info "Stopped process $pid on port $Port"
            } catch {}
        }
    }
}

Stop-ProcessOnPort 8178  # Whisper server
Stop-ProcessOnPort 5167  # Python backend
Stop-ProcessOnPort 3118  # Next.js dev server

# Also kill any orphaned processes
Get-Process -Name "whisper-server" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process -Name "meetily" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 2
Write-Success "Cleanup complete"

# ============================================================================
# STEP 3: Start Whisper Server
# ============================================================================
Write-Step "Starting Whisper Server on port 8178..."

if (-not (Test-Path $WhisperServerPath)) {
    Write-Warn "Whisper server not found at: $WhisperServerPath"
    Write-Info "Trying alternative location..."
    $WhisperServerPath = Join-Path $BackendDir "whisper-server-package\whisper-server.exe"
}

if (-not (Test-Path $WhisperModelPath)) {
    Write-Warn "Whisper model not found at: $WhisperModelPath"
    Write-Info "Trying alternative location..."
    $WhisperModelPath = Join-Path $BackendDir "models\ggml-small.bin"
}

if (Test-Path $WhisperServerPath) {
    if (Test-Path $WhisperModelPath) {
        $whisperJob = Start-Job -ScriptBlock {
            param($serverPath, $modelPath)
            Set-Location (Split-Path $serverPath)
            & $serverPath --model $modelPath --host 127.0.0.1 --port 8178
        } -ArgumentList $WhisperServerPath, $WhisperModelPath
        
        Start-Sleep -Seconds 3
        
        # Verify it started
        $whisperRunning = Test-NetConnection -ComputerName 127.0.0.1 -Port 8178 -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
        if ($whisperRunning.TcpTestSucceeded) {
            Write-Success "Whisper Server started on http://127.0.0.1:8178"
        } else {
            Write-Warn "Whisper Server may still be starting..."
        }
    } else {
        Write-Warn "Whisper model not found. Transcription will use Tauri's built-in engine."
    }
} else {
    Write-Warn "Whisper server executable not found. Transcription will use Tauri's built-in engine."
}

# ============================================================================
# STEP 4: Start Python Backend
# ============================================================================
Write-Step "Starting Python Backend on port 5167..."

# Ensure backend dependencies are installed
Set-Location $BackendDir
$requirementsFile = Join-Path $BackendDir "requirements.txt"

if (Test-Path $requirementsFile) {
    Write-Info "Checking Python dependencies..."
    & $pythonPath -m pip install -r $requirementsFile --quiet 2>$null
}

# Start the backend
$backendJob = Start-Job -ScriptBlock {
    param($pythonPath, $backendDir)
    Set-Location $backendDir
    & $pythonPath -m uvicorn app.main:app --host 0.0.0.0 --port 5167 --reload
} -ArgumentList $pythonPath, $BackendDir

Start-Sleep -Seconds 5

# Verify backend started
try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:5167/docs" -TimeoutSec 5 -UseBasicParsing -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Success "Python Backend started on http://127.0.0.1:5167"
        Write-Info "API docs available at http://127.0.0.1:5167/docs"
    }
} catch {
    Write-Warn "Python Backend may still be starting... Check logs if issues persist."
}

# ============================================================================
# STEP 5: Start Tauri Desktop App
# ============================================================================
Write-Step "Starting Tauri Desktop App..."

Set-Location $FrontendDir

# Ensure frontend dependencies
if (-not (Test-Path (Join-Path $FrontendDir "node_modules"))) {
    Write-Info "Installing frontend dependencies..."
    pnpm install
}

Write-Host "`n"
Write-Host "=================================================================" -ForegroundColor Green
Write-Success "All services starting! The Tauri app will open shortly..."
Write-Host "=================================================================" -ForegroundColor Green
Write-Host "`n"
Write-Info "Services:"
Write-Host "  * Whisper Server: http://127.0.0.1:8178" -ForegroundColor Cyan
Write-Host "  * Python Backend: http://127.0.0.1:5167" -ForegroundColor Cyan
Write-Host "  * Frontend Dev:   http://localhost:3118" -ForegroundColor Cyan
Write-Host "`n"
Write-Info "Press Ctrl+C to stop all services"
Write-Host "`n"

# Run Tauri dev (this blocks and shows output)
pnpm run tauri:dev

# Cleanup when Tauri exits
Write-Step "Shutting down services..."
if ($whisperJob) { Stop-Job $whisperJob -ErrorAction SilentlyContinue; Remove-Job $whisperJob -ErrorAction SilentlyContinue }
if ($backendJob) { Stop-Job $backendJob -ErrorAction SilentlyContinue; Remove-Job $backendJob -ErrorAction SilentlyContinue }
Stop-ProcessOnPort 8178
Stop-ProcessOnPort 5167
Write-Success "All services stopped."
