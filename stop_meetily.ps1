Write-Host "Stopping Backend (Docker)..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot\backend"
.\run-docker.ps1 stop

Write-Host "Backend stopped." -ForegroundColor Green
